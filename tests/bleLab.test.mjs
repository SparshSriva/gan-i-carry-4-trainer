import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../tools/ble-test/traceGatt.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext}}).outputText;
const {traceGatt}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

test('lab trace preserves call receiver, service arguments/results and original methods without extra BLE operations',async()=>{
  let connects=0,reads=0;const lines=[],services=[{uuid:'gen3-fixture'}];
  const gatt={connected:false,async connect(){assert.equal(this,gatt);connects++;this.connected=true;return this;},async getPrimaryServices(uuid){assert.equal(this,gatt);assert.equal(uuid,'requested');reads++;return services;}};
  const originalConnect=gatt.connect,originalDiscover=gatt.getPrimaryServices,restore=traceGatt(gatt,line=>lines.push(line));
  assert.equal(await gatt.connect(),gatt);assert.equal(await gatt.getPrimaryServices('requested'),services);
  assert.equal(connects,1);assert.equal(reads,1);assert.match(lines.join('\n'),/connect RESOLVED.*connected=true/);assert.match(lines.join('\n'),/gen3-fixture/);
  restore();assert.equal(gatt.connect,originalConnect);assert.equal(gatt.getPrimaryServices,originalDiscover);
});
test('lab trace distinguishes a successful connect followed by a disconnect during service discovery without retrying',async()=>{
  const failure=new Error('GATT Server is disconnected');failure.name='NetworkError';const lines=[];let reads=0;
  const gatt={connected:false,async connect(){this.connected=true;return this;},async getPrimaryServices(){reads++;this.connected=false;throw failure;}};
  const restore=traceGatt(gatt,line=>lines.push(line));
  try{await gatt.connect();await assert.rejects(()=>gatt.getPrimaryServices(),error=>error===failure);assert.equal(reads,1);assert.match(lines.join('\n'),/getPrimaryServices BEGIN connected=true/);assert.match(lines.join('\n'),/getPrimaryServices REJECTED.*connected=false.*NetworkError/);}
  finally{restore();}
});
