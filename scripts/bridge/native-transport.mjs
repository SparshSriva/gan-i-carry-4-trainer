import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

export class NativeTransport {
  pending=new Map(); sequence=0; listeners=new Set();
  constructor(python) {
    this.child=spawn(python,['-u',fileURLToPath(new URL('./ble_worker.py',import.meta.url))],{windowsHide:true,stdio:['pipe','pipe','pipe']});
    this.child.stderr.on('data',bytes=>process.stderr.write(bytes));
    createInterface({input:this.child.stdout}).on('line',line=>{
      try {const message=JSON.parse(line);if(message.event){for(const listener of this.listeners)listener(message);return;}
        const pending=this.pending.get(message.id);if(!pending)return;this.pending.delete(message.id);clearTimeout(pending.timer);
        if(message.error)pending.reject(new Error(message.error));else pending.resolve(message.result);
      }catch(error){console.error('Native bridge message:',error.message);}
    });
    const failed=error=>{this.failure=error;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(error);}this.pending.clear();for(const listener of this.listeners)listener({event:'disconnect'});};
    this.child.on('error',failed);this.child.on('exit',()=>failed(new Error('Native BLE worker stopped. Run npm run setup:bridge and restart the bridge.')));
  }
  call(op,args={}) {
    if(this.failure)return Promise.reject(this.failure);
    return new Promise((resolve,reject)=>{const id=++this.sequence;const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`Native ${op} timed out.`));},40000);
      this.pending.set(id,{resolve,reject,timer});this.child.stdin.write(JSON.stringify({id,op,...args})+'\n');
    });
  }
  onEvent(listener){this.listeners.add(listener);return()=>this.listeners.delete(listener);}
  close(){this.child.kill();}
}

/** A narrow GATT adapter lets the existing maintained library decode GAN packets. */
export function nativeDevice(transport,selected,onError=()=>{}) {
  let queue=Promise.resolve();
  const device=new EventTarget();device.id=selected.id;device.name=selected.name;device.mac=selected.mac;
  const characteristics=new Map();
  device.gatt={connected:false,connect:async()=>{
    const services=await transport.call('connect',{deviceId:selected.id});device.gatt.connected=true;
    device.gatt.getPrimaryServices=async()=>services.map(service=>({uuid:service.uuid,getCharacteristic:async uuid=>{
      const info=service.characteristics.find(c=>c.uuid.toLowerCase()===uuid.toLowerCase());
      if(!info)throw new Error(`Missing GAN characteristic ${uuid}`);
      const c=new EventTarget();c.uuid=uuid;c.value=null;
      c.writeValue=bytes=>transport.call('write',{uuid,hex:Buffer.from(bytes).toString('hex'),response:info.properties.includes('write')});
      c.startNotifications=async()=>{await transport.call('subscribe',{uuid});return c;};
      c.stopNotifications=()=>transport.call('unsubscribe',{uuid});characteristics.set(uuid.toLowerCase(),c);return c;
    }}));return device.gatt;
  },disconnect:()=>{void transport.call('disconnect').catch(onError);}};
  const remove=transport.onEvent(message=>{
    if(message.event==='disconnect'){device.gatt.connected=false;device.dispatchEvent(new Event('gattserverdisconnected'));}
    if(message.event==='notification'){
      const c=characteristics.get(message.uuid.toLowerCase());if(!c)return;
      const bytes=Uint8Array.from(Buffer.from(message.hex,'hex'));c.value=new DataView(bytes.buffer);
      // EventTarget does not await async listeners. Capture them explicitly so
      // packet decoding and protocol recovery cannot race one another.
      queue=queue.then(async()=>{c.value=new DataView(bytes.buffer);for(const handler of c.handlers??[])await handler({target:c});}).catch(onError);
    }
  });
  const connect=device.gatt.connect;
  device.gatt.connect=async()=>{await connect();const get=device.gatt.getPrimaryServices;device.gatt.getPrimaryServices=async()=>(await get()).map(s=>{
    const original=s.getCharacteristic;s.getCharacteristic=async uuid=>{const c=await original(uuid);c.handlers=new Set();
      c.addEventListener=(name,handler)=>{if(name==='characteristicvaluechanged')c.handlers.add(handler);};
      c.removeEventListener=(name,handler)=>{if(name==='characteristicvaluechanged')c.handlers.delete(handler);};return c;};return s;
  });return device.gatt;};
  return {device,dispose:remove};
}
