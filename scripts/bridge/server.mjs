import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const {connectGanCube,now}=createRequire(import.meta.url)('gan-web-bluetooth');
import { NativeTransport, nativeDevice } from './native-transport.mjs';
import { initializeCubeConnection } from '../../src/utils/connectionHandshake.mjs';
import { knownCubeMac } from '../../src/utils/knownCube.mjs';

export function createBridge(transport,{port=2015}={}) {
  let devices=[],connection=null,adapter=null,subscription=null,lease=null,busy=false,lastSeen=0;
  let sequence=0;const events=[];const epochOffset=Date.now()-now();
  const publish=event=>{events.push({sequence:++sequence,event});if(events.length>512)events.shift();};
  const disconnect=async()=>{const previous=connection,partial=adapter;connection=null;subscription?.unsubscribe();subscription=null;lease=null;partial?.dispose();adapter=null;if(previous)await previous.disconnect();if(previous || partial)await transport.call('disconnect');};
  const fail=error=>{publish({type:'BRIDGE_ERROR',message:error.message});void disconnect().catch(()=>{});};
  const server=createServer(async(req,res)=>{
    const origin=req.headers.origin;
    const allowed=new Set((process.env.CUBE_BRIDGE_ORIGINS??'http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:4173,http://localhost:4173,http://127.0.0.1:5174,http://localhost:5174').split(','));
    if(![`127.0.0.1:${server.address()?.port}`,`localhost:${server.address()?.port}`,...Array.from(allowed,o=>new URL(o).host)].includes(req.headers.host) || origin && !allowed.has(origin)){
      res.writeHead(403);res.end('Origin refused');return;
    }
    const json=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
    try {
      const url=new URL(req.url,'http://127.0.0.1');
      if(req.method==='GET' && url.pathname==='/status'){json(200,{version:1,connected:Boolean(connection) && !busy,busy:busy||Boolean(lease)});return;}
      if(req.headers['x-cube-bridge']!=='1'){json(403,{error:'Bridge request header required'});return;}
      if(req.method==='GET' && url.pathname==='/events'){
        if(!lease || req.headers.authorization!==`Bearer ${lease}`){json(401,{error:'Connection belongs to another client or has ended.'});return;}
        lastSeen=Date.now();const since=Number(url.searchParams.get('since'));
        if(!Number.isInteger(since) || since<0 || since>sequence){json(400,{error:'Invalid event cursor'});return;}
        if(events.length && since<events[0].sequence-1){json(409,{error:'Bridge event buffer overrun; reconnect from solved.'});return;}
        json(200,{cursor:sequence,events:events.filter(e=>e.sequence>since)});return;
      }
      if(req.method!=='POST'){json(404,{error:'Unknown bridge endpoint'});return;}
      let body='';for await(const chunk of req){body+=chunk;if(body.length>4096){json(413,{error:'Request too large'});return;}}
      const data=JSON.parse(body||'{}');
      if(url.pathname==='/scan'){
        if(busy || lease){json(409,{error:'A bridge client is already connecting or connected.'});return;}
        busy=true;try{devices=await transport.call('scan');json(200,{devices});}finally{busy=false;}return;
      }
      if(url.pathname==='/connect'){
        if(busy || lease){json(409,{error:'A bridge client already owns the cube.'});return;}
        const selected=devices.find(d=>d.id===data.deviceId);if(!selected)throw new Error('Scan and select a cube first.');
        const mac=knownCubeMac(selected.name)??selected.mac??data.mac;
        if(!/^(?:[0-9A-F]{2}:){5}[0-9A-F]{2}$/i.test(mac??''))throw new Error('Cube did not advertise a usable MAC. Enter its actual MAC to continue.');
        busy=true;const cursor=sequence;
        try {
          adapter=nativeDevice(transport,{...selected,mac},fail);
          Object.defineProperty(globalThis,'navigator',{configurable:true,value:{bluetooth:{requestDevice:async()=>adapter.device}}});
          connection=await connectGanCube(async()=>mac);
          subscription=connection.events$.subscribe(event=>{
            if(event.type==='MOVE')publish({...event,localTimestamp:event.localTimestamp===null?null:event.localTimestamp+epochOffset});else publish(event);
            if(event.type==='DISCONNECT')void disconnect().catch(()=>{});
          });
          lease=randomUUID();lastSeen=Date.now();
          await initializeCubeConnection(connection);
          if(!connection)throw new Error('Cube disconnected during setup.');
          json(200,{lease,cursor,deviceName:connection.deviceName});
        }catch(error){await disconnect().catch(()=>{});throw error;}finally{busy=false;}return;
      }
      if(!lease || req.headers.authorization!==`Bearer ${lease}`){json(401,{error:'Connection owner required'});return;}
      lastSeen=Date.now();
      if(url.pathname==='/disconnect'){await disconnect();json(200,{ok:true});return;}
      if(url.pathname==='/command'){
        if(!['REQUEST_HARDWARE','REQUEST_BATTERY','REQUEST_FACELETS','REQUEST_RESET'].includes(data.type))throw new Error('Unsupported cube command.');
        if(!connection)throw new Error('Cube disconnected.');
        await connection.sendCubeCommand({type:data.type});json(200,{ok:true});return;
      }
      json(404,{error:'Unknown bridge endpoint'});
    }catch(error){json(500,{error:error.message});}
  });
  const heartbeat=setInterval(()=>{if(lease && Date.now()-lastSeen>15000)void disconnect().catch(()=>{});},3000);heartbeat.unref();
  return {server,start:()=>new Promise(resolve=>server.listen(port,'127.0.0.1',resolve)),close:async()=>{clearInterval(heartbeat);await disconnect().catch(()=>{});transport.close();await new Promise(resolve=>server.close(resolve));}};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const python=process.env.CUBE_BRIDGE_PYTHON??fileURLToPath(new URL(process.platform==='win32'?'../../.runtime/ble/Scripts/python.exe':'../../.runtime/ble/bin/python',import.meta.url));
  const bridge=createBridge(new NativeTransport(python));await bridge.start();console.log('Native GAN bridge listening on 127.0.0.1:2015. Select Local bridge in the app.');
  const stop=()=>void bridge.close().finally(()=>process.exit());process.on('SIGINT',stop);process.on('SIGTERM',stop);
}
