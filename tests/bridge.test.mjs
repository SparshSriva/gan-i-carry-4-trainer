import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptedFixture, solvedPacket } from './ganFixtures.mjs';
import { createBridge } from '../scripts/bridge/server.mjs';
import { Readable } from 'node:stream';

class FakeNative {
  listeners=new Set();calls=[];initialized=false;
  onEvent(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
  emit(message){for(const listener of this.listeners)listener(message);}
  async call(op,args={}){
    this.calls.push({op,...args});
    if(op==='scan')return [{id:'cube',name:'GAN test',mac:'01:02:03:04:05:06',rssi:-40}];
    if(op==='connect')return [{uuid:'00000010-0000-fff7-fff6-fff5fff4fff0',characteristics:[{uuid:'0000fff5-0000-1000-8000-00805f9b34fb',properties:['write']},{uuid:'0000fff6-0000-1000-8000-00805f9b34fb',properties:['notify']}]}];
    if(op==='write' && !this.initialized){this.initialized=true;this.emit({event:'notification',uuid:'0000fff6-0000-1000-8000-00805f9b34fb',hex:encryptedFixture(solvedPacket())});}
    return true;
  }
  close(){}
}

test('bridge handler verifies encrypted initialization, owner isolation and command restrictions',async()=>{
  const native=new FakeNative(),bridge=createBridge(native,{port:0});
  const live=process.env.CUBE_LIVE_HTTP==='1';if(live)await bridge.start();
  const base=live?`http://127.0.0.1:${bridge.server.address().port}`:'';
  const request=(path,body,lease,extra={},withHeader=true)=>{
    const headers={...(withHeader?{'x-cube-bridge':'1'}:{}),...(lease?{authorization:`Bearer ${lease}`}:{ }),...extra};
    if(live)return fetch(base+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)});
    // Exercise the actual HTTP handler without opening sockets. An opt-in
    // live mode below retains loopback integration coverage where permitted.
    return new Promise(resolve=>{
      const req=Readable.from(body===undefined?[]:[JSON.stringify(body)]);req.url=path;req.method=body===undefined?'GET':'POST';req.headers={host:'127.0.0.1:5173',...headers};
      let status=200;const res={writeHead:code=>{status=code;},end:value=>resolve(new Response(value,{status}))};bridge.server.emit('request',req,res);
    });
  };
  try {
    assert.equal((await request('/scan',{},null,{origin:'https://unrelated.example'})).status,403);
    assert.equal((await request('/scan',{},null,{},false)).status,403);
    const scan=await (await request('/scan',{},null,{origin:'http://127.0.0.1:5174'})).json();assert.equal(scan.devices[0].mac,'01:02:03:04:05:06');
    assert.equal((await request('/connect',{deviceId:'unknown'})).status,500);
    const conn=await (await request('/connect',{deviceId:'cube'})).json();assert.ok(conn.lease);assert.equal(conn.deviceName,'GAN test');
    assert.equal((await request('/connect',{deviceId:'cube'})).status,409);
    assert.equal((await request('/command',{type:'REQUEST_RESET'},'wrong')).status,401);
    assert.equal((await request('/command',{type:'ARBITRARY_WRITE'},conn.lease)).status,500);
    // Public Gen4 battery packet, encrypted with the library's standard test
    // cube key/IV salted by the fixture MAC. Decode uses the real dependency.
    const payload=Buffer.alloc(16);payload.set([0xEF,1,80]);const hex=encryptedFixture(payload);
    native.emit({event:'notification',uuid:'0000fff6-0000-1000-8000-00805f9b34fb',hex});
    await new Promise(resolve=>setImmediate(resolve));
    const batch=await (await request(`/events?since=${conn.cursor}`,undefined,conn.lease)).json();assert.equal(batch.events.find(item=>item.event.type==='BATTERY').event.batteryLevel,80);
    assert.ok(native.calls.some(c=>c.op==='write' && c.response===true));
    assert.equal((await request('/command',{type:'REQUEST_RESET'},conn.lease)).status,200);
    assert.equal((await request('/disconnect',{},conn.lease)).status,200);
    assert.equal((await request('/events?since=0',undefined,conn.lease)).status,401);
    assert.equal((await (await request('/status')).json()).connected,false);
  }finally{await bridge.close();}
});
