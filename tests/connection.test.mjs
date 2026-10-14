import test from 'node:test';
import assert from 'node:assert/strict';
import { Subject } from 'rxjs';
import { encryptedFixture, solvedPacket } from './ganFixtures.mjs';
import { createRequire } from 'node:module';
import { nativeDevice } from '../scripts/bridge/native-transport.mjs';
import { initializeCubeConnection } from '../src/utils/connectionHandshake.mjs';
const {connectGanCube}=createRequire(import.meta.url)('gan-web-bluetooth');
const solved='UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';

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
