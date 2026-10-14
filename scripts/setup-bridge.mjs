import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root=new URL('../.runtime/ble/',import.meta.url);
await mkdir(root,{recursive:true});
function run(command,args){return new Promise((resolve,reject)=>{const child=spawn(command,args,{windowsHide:true,stdio:'inherit'});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`${command} exited ${code}`)));});}
await run(process.env.CUBE_PYTHON??'python',['-m','venv',fileURLToPath(root)]);
const python=fileURLToPath(new URL(process.platform==='win32'?'Scripts/python.exe':'bin/python',root));
await run(python,['-m','pip','install','bleak==3.0.1']);
console.log('Native BLE runtime ready. Start with npm run bridge.');
