import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/utils/gattDiscovery.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext}}).outputText;
const {configureGanGatt,GAN_SERVICES}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const leaseSource=await readFile(new URL('../tools/ble-test/connectionLease.ts',import.meta.url),'utf8');
const leaseCode=ts.transpileModule(leaseSource,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext}}).outputText;
const {acquireConnectionLease}=await import(`data:text/javascript;base64,${Buffer.from(leaseCode).toString('base64')}`);

test('lab rejects overlapping tab attempts and releases the lock after cleanup',async()=>{
  const original=Object.getOwnPropertyDescriptor(globalThis,'navigator');let owned=false;
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request:async(_name,_options,callback)=>{
    if(owned)return callback(null);
    owned=true;try{return await callback({name:'test-lock'});}finally{owned=false;}
  }}}});
  try{
    const release=await acquireConnectionLease();
    await assert.rejects(acquireConnectionLease(),/Another BLE lab tab/);assert.equal(owned,true);
    release();await new Promise(resolve=>setImmediate(resolve));assert.equal(owned,false);
    const next=await acquireConnectionLease();next();await new Promise(resolve=>setImmediate(resolve));assert.equal(owned,false);
  }finally{if(original)Object.defineProperty(globalThis,'navigator',original);else delete globalThis.navigator;}
});

test('targeted setup preserves explicitly filtered calls, receivers and restores original methods',async()=>{
  let connects=0,reads=0;const lines=[],services=[{uuid:'gen3-fixture'}];
  const gatt={connected:false,async connect(){assert.equal(this,gatt);connects++;this.connected=true;return this;},async getPrimaryServices(uuid){assert.equal(this,gatt);assert.equal(uuid,'requested');reads++;return services;}};
  const originalConnect=gatt.connect,originalDiscover=gatt.getPrimaryServices,restore=configureGanGatt(gatt,line=>lines.push(line));
  assert.equal(await gatt.connect(),gatt);assert.equal(await gatt.getPrimaryServices('requested'),services);
  assert.equal(connects,1);assert.equal(reads,1);assert.match(lines.join('\n'),/connect RESOLVED.*connected=true/);
  restore();assert.equal(gatt.connect,originalConnect);assert.equal(gatt.getPrimaryServices,originalDiscover);
});
test('targeted discovery stops on a lost link without trying more services or reconnecting',async()=>{
  const failure=new Error('GATT Server is disconnected');failure.name='NetworkError';const lines=[];let reads=0;
  const gatt={connected:false,async connect(){this.connected=true;return this;},async getPrimaryServices(){throw new Error('unfiltered query');},async getPrimaryService(){reads++;this.connected=false;throw failure;}};
  const restore=configureGanGatt(gatt,line=>lines.push(line));
  try{await gatt.connect();await assert.rejects(()=>gatt.getPrimaryServices(),error=>error===failure);assert.equal(reads,1);assert.match(lines.join('\n'),/Querying GAN Gen3/);assert.match(lines.join('\n'),/query failed.*connected=false.*NetworkError/);}
  finally{restore();}
});

test('absent Gen3 service falls through to an actual Gen4 or Gen2 service on the same connection',async()=>{
  for(const selected of [1,2]){
    const queries=[];const gatt={connected:true,connect:async()=>gatt,getPrimaryServices:async()=>{throw new Error('unfiltered query');},getPrimaryService:async uuid=>{
      queries.push(uuid);if(uuid===GAN_SERVICES[selected].uuid)return {uuid};const error=new Error('Absent');error.name='NotFoundError';throw error;
    }};
    const restore=configureGanGatt(gatt);
    try{assert.deepEqual(await gatt.getPrimaryServices(),[{uuid:GAN_SERVICES[selected].uuid}]);assert.deepEqual(queries,GAN_SERVICES.slice(0,selected+1).map(s=>s.uuid));}finally{restore();}
  }
});
test('disconnected links, unknown profiles and mismatched service responses never pass discovery',async()=>{
  for(const mode of ['disconnected','absent','mismatch']){
    let queries=0;const gatt={connected:mode!=='disconnected',connect:async()=>gatt,getPrimaryServices:async()=>[],getPrimaryService:async()=>{
      queries++;if(mode==='mismatch')return {uuid:GAN_SERVICES[1].uuid};const error=new Error('Absent');error.name='NotFoundError';throw error;
    }};
    const restore=configureGanGatt(gatt);try{await assert.rejects(()=>gatt.getPrimaryServices());assert.equal(queries,mode==='disconnected'?0:mode==='absent'?3:1);}finally{restore();}
  }
});
