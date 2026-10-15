import test from 'node:test';
import assert from 'node:assert/strict';
import { Subject } from 'rxjs';
import { encryptedFixture, solvedPacket, gen3SolvedPacket } from './ganFixtures.mjs';
import { createRequire } from 'node:module';
import { nativeDevice } from '../scripts/bridge/native-transport.mjs';
import { initializeCubeConnection } from '../src/utils/connectionHandshake.mjs';
const {connectGanCube}=createRequire(import.meta.url)('gan-web-bluetooth');
const solved='UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';

test('Gen3 service selects the real driver, subscribes before exact startup writes, and decodes state/moves/battery',async()=>{
  const service='8653000a-43e6-47b7-9cb0-5fc21d4ae340',write='8653000c-43e6-47b7-9cb0-5fc21d4ae340',notify='8653000b-43e6-47b7-9cb0-5fc21d4ae340';
  const listeners=new Set(),operations=[],commands=[],events=[];
  const emit=bytes=>{for(const fn of listeners)fn({event:'notification',uuid:notify,hex:encryptedFixture(bytes)});};
  const transport={onEvent:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},call:async(op,args)=>{
    operations.push(op);
    if(op==='connect')return [{uuid:service,characteristics:[{uuid:write,properties:['write']},{uuid:notify,properties:['notify']}]}];
    if(op==='subscribe')assert.equal(args.uuid,notify);
    if(op==='write'){
      assert.equal(args.uuid,write);assert.ok(operations.includes('subscribe'));
      const command=commands.length;commands.push(args.hex);
      const expected=Buffer.alloc(16);expected.set([0x68,[4,1,7][command]??5]);
      if(command<3)assert.equal(args.hex,encryptedFixture(expected));
      if(command===1)emit(gen3SolvedPacket());
      if(command===2){const battery=Buffer.alloc(16);battery.set([0x55,0x10,1,83]);emit(battery);}
    }
    return true;
  }};
  const adapter=nativeDevice(transport,{id:'gen3-test',name:'GAN synthetic Gen3',mac:'01:02:03:04:05:06'});
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{bluetooth:{requestDevice:async options=>{assert.ok(options.optionalServices.includes(service));return adapter.device;}}}});
  const conn=await connectGanCube(async()=>adapter.device.mac),sub=conn.events$.subscribe(event=>events.push(event));
  try{
    // Gen3 deliberately ignores moves until its initial facelets serial arrives.
    const turn=(serial,mask,direction=0)=>{const bytes=Buffer.alloc(16);bytes.set([0x55,1,7]);bytes.writeUInt32LE(serial*100,3);bytes.writeUInt16LE(serial,7);bytes[9]=(direction<<6)|mask;return bytes;};
    emit(turn(1,32));await new Promise(resolve=>setImmediate(resolve));assert.equal(events.length,0);
    assert.equal(await initializeCubeConnection(conn,()=>{},100),solved);
    emit(turn(1,32));emit(turn(2,2,1));
    await new Promise(resolve=>setImmediate(resolve));
    assert.deepEqual(events.filter(e=>e.type==='MOVE').map(e=>[e.move,e.serial]),[['R',1],["U'",2]]);
    assert.equal(events.find(e=>e.type==='BATTERY').batteryLevel,83);
    await conn.sendCubeCommand({type:'REQUEST_RESET'});
    assert.equal(commands[3],encryptedFixture(Buffer.from([0x68,5,5,0x39,0x77,0,0,1,0x23,0x45,0x67,0x89,0xab,0,0,0])));
  }finally{sub.unsubscribe();await conn.disconnect();adapter.dispose();}
  assert.ok(operations.includes('unsubscribe'));assert.ok(operations.includes('disconnect'));
});

test('initialization requires decoded state and follows hardware/facelets/battery order',async()=>{
  const events$=new Subject(),commands=[];
  const conn={events$,sendCubeCommand:async command=>{commands.push(command.type);if(command.type==='REQUEST_FACELETS')events$.next({type:'FACELETS',facelets:solved});}};
  assert.equal(await initializeCubeConnection(conn,()=>{},100),solved);
  assert.deepEqual(commands,['REQUEST_HARDWARE','REQUEST_FACELETS','REQUEST_BATTERY']);assert.equal(events$.observed,false);
});
test('initialization rejects wrong-key silence, invalid state, and startup write failures',async()=>{
  for(const mode of ['silent','invalid','write','disconnect']){
    const events$=new Subject();
    const conn={events$,sendCubeCommand:async()=>{if(mode==='write')throw new Error('GATT write failed');if(mode==='invalid')events$.next({type:'FACELETS',facelets:'bad'});if(mode==='disconnect')events$.next({type:'DISCONNECT'});}};
    await assert.rejects(()=>initializeCubeConnection(conn,()=>{},10));assert.equal(events$.observed,false);
  }
});
test('real Gen4 decoder initializes from encrypted facelets and receives ordered R/U turns',async()=>{
  const listeners=new Set();let sent=false;
  const transport={onEvent:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},call:async op=>{
    if(op==='connect')return [{uuid:'00000010-0000-fff7-fff6-fff5fff4fff0',characteristics:[{uuid:'0000fff5-0000-1000-8000-00805f9b34fb',properties:['write']},{uuid:'0000fff6-0000-1000-8000-00805f9b34fb',properties:['notify']}]}];
    if(op==='write' && !sent){sent=true;for(const fn of listeners)fn({event:'notification',uuid:'0000fff6-0000-1000-8000-00805f9b34fb',hex:encryptedFixture(solvedPacket())});}
    return true;
  }};
  const adapter=nativeDevice(transport,{id:'test',name:'GAN test',mac:'01:02:03:04:05:06'});
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{bluetooth:{requestDevice:async()=>adapter.device}}});
  const conn=await connectGanCube(async()=>adapter.device.mac),moves=[];
  const sub=conn.events$.subscribe(event=>{if(event.type==='MOVE')moves.push(event);});
  try {
    assert.equal(await initializeCubeConnection(conn,()=>{},100),solved);
    for(const [serial,mask] of [[1,32],[2,2]]){const data=Buffer.alloc(16);data.set([1,9]);data.writeUInt32LE(serial*100,2);data.writeUInt16LE(serial,6);data[8]=mask;for(const fn of listeners)fn({event:'notification',uuid:'0000fff6-0000-1000-8000-00805f9b34fb',hex:encryptedFixture(data)});}
    await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(moves.map(m=>m.move),['R','U']);assert.deepEqual(moves.map(m=>m.serial),[1,2]);
  }finally{sub.unsubscribe();await conn.disconnect();adapter.dispose();}
});
