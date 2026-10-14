import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
export const version='1.2.3';
export const checksum='e9ff6a164effee8a7ecdcc5c18111d4aa09d1de471b71de224889a1282d98cd5';
export const runtime=new URL('../.runtime/tnoodle/',import.meta.url);
export const jar=new URL(`TNoodle-WCA-${version}.jar`,runtime);
export async function setup() {
  await mkdir(runtime,{recursive:true});
  let bytes;
  try {bytes=await readFile(jar);} catch {
    console.log(`Downloading the official TNoodle-WCA ${version} runtime (about 32 MB)…`);
    const response=await fetch(`https://github.com/thewca/tnoodle/releases/download/v${version}/TNoodle-WCA-${version}.jar`);
    if(!response.ok)throw new Error(`TNoodle download failed: ${response.status}`);
    bytes=Buffer.from(await response.arrayBuffer());
  }
  if(createHash('sha256').update(bytes).digest('hex')!==checksum)throw new Error('TNoodle checksum did not match the pinned official release.');
  await writeFile(jar,bytes);
}
export async function startTNoodle() {
  const check=async()=>{const response=await fetch('http://127.0.0.1:2014/version',{signal:AbortSignal.timeout(1000)});const v=await response.json();if(v.projectName!=='TNoodle-WCA'||v.projectVersion!==version||v.signedBuild!==true)throw new Error('Port 2014 is occupied by a different or unverified program.');};
  try {await check();return null;} catch(e) {if(e.message.includes('occupied'))throw e;}
  await setup();
  const child=spawn('java',['-Djava.awt.headless=true','-Dktor.deployment.host=127.0.0.1','-jar',fileURLToPath(jar),'--nobrowser','--noiconbar','--noupgrade','--noReexec','--port','2014'],{cwd:fileURLToPath(runtime),windowsHide:true,stdio:'inherit'});
  let failure;child.on('error',e=>{failure=e;});
  for(let i=0;i<60;i++){
    if(failure)throw new Error(`Could not start Java: ${failure.message}. Install Java 17+ or paste a scramble.`);
    if(child.exitCode!==null)throw new Error('TNoodle stopped before it was ready.');
    try{await check();return child;}catch(e){if(e.message.includes('occupied')){child.kill();throw e;}}
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  child.kill();throw new Error('Timed out starting TNoodle.');
}
if(process.argv.includes('--setup')){await setup();console.log(`Verified TNoodle-WCA ${version}.`);}
