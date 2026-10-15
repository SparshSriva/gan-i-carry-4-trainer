import { connectGanCube } from 'gan-web-bluetooth';
import type { GanCubeConnection, GanCubeEvent } from 'gan-web-bluetooth';
import type { Subscription } from 'rxjs';
import { configureGanGatt } from '../../src/utils/gattDiscovery';
import { acquireConnectionLease } from './connectionLease';
import { scanBridge, connectNativeBridge } from '../../src/utils/nativeBridge';
import { KNOWN_CUBE,knownCubeMac } from '../../src/utils/knownCube.mjs';

const element=(id:string)=>document.getElementById(id)!;
const button=(id:string)=>element(id) as HTMLButtonElement;
const mac=element('mac') as HTMLInputElement;
mac.value=KNOWN_CUBE.mac;
element('connection-build').textContent='Targeted GAN service discovery · fixed cube MAC · one connection attempt';
const transport=element('transport') as HTMLSelectElement,bridgeDevices=element('bridge-devices') as HTMLSelectElement;
let connection:GanCubeConnection|null=null,subscription:Subscription|null=null,device:BluetoothDevice|null=null;
let busy=false,ready=false,cancelRequested=false,turns=0,lastSerial:number|null=null,verificationTimer:ReturnType<typeof setTimeout>|undefined;
let lines:string[]=[],moves:string[]=[];
let restoreTrace:(()=>void)|undefined;
let releaseLease:(()=>void)|undefined;
function releaseIdleLease(){if(!busy){releaseLease?.();releaseLease=undefined;}}
function restoreGatt(){restoreTrace?.();restoreTrace=undefined;}
const started=performance.now();
function log(message:string){
  lines.push(`${new Date().toISOString()} +${Math.round(performance.now()-started)}ms ${message}`);
  lines=lines.slice(-1000);element('log').textContent=lines.join('\n');element('log').scrollTop=element('log').scrollHeight;
}
function status(title:string,detail:string){element('status').textContent=title;element('detail').textContent=detail;}
function controls(){button('connect').disabled=busy||!!connection;button('disconnect').disabled=!connection&&!device?.gatt?.connected;button('disconnect').textContent=busy?'Cancel connection':'Disconnect';button('refresh').disabled=busy||!connection;mac.disabled=busy||!!connection;transport.disabled=busy||!!connection;bridgeDevices.disabled=busy||!!connection;button('scan').disabled=busy||!!connection;}
function errorText(error:unknown){return error instanceof Error?`${error.name}: ${error.message}`:String(error);}
function cleanup(){clearTimeout(verificationTimer);subscription?.unsubscribe();subscription=null;connection=null;ready=false;releaseIdleLease();controls();}
function onLinkDisconnect(){log('GATT disconnected event');status('Disconnected','The physical BLE link closed. Download the log before another attempt.');}
function onEvent(event:GanCubeEvent){
  log(JSON.stringify(event));
  if(event.type==='MOVE'){
    turns++;element('last-move').textContent=event.move;
    const expected=lastSerial===null?null:(lastSerial+1)&255;
    element('move-info').textContent=`Serial ${event.serial} · cube time ${event.cubeTimestamp??'unknown'} ms · host time ${event.localTimestamp===null?'recovered / untimed':event.localTimestamp.toFixed(1)+' ms'}${expected!==null&&event.serial!==expected?' · SEQUENCE GAP / DUPLICATE':''}`;
    lastSerial=event.serial;moves.push(event.move);moves=moves.slice(-40);element('moves').textContent=moves.join(' ');element('count').textContent=`Turns received: ${turns}`;
  }else if(event.type==='FACELETS'){
    const valid=/^[URFDLB]{54}$/.test(event.facelets)&&[...'URFDLB'].every(face=>[...event.facelets].filter(c=>c===face).length===9);
    element('facelets').textContent=event.facelets.match(/.{1,9}/g)?.join('\n')??event.facelets;
    if(valid){ready=true;clearTimeout(verificationTimer);status('Receiving decoded cube state','Turn one face at a time. Raw GAN face names appear below; no grip conversion is applied.');}
    else status('Invalid decoded state','Keep the log: the returned snapshot failed sticker validation.');
  }else if(event.type==='BATTERY')element('battery').textContent=`Battery: ${event.batteryLevel}%`;
  else if(event.type==='HARDWARE')element('hardware').textContent=`Hardware: ${event.hardwareName??'unknown'} · firmware ${event.softwareVersion??'unknown'} · gyro ${event.gyroSupported??'unknown'}`;
  else if(event.type==='DISCONNECT'){onLinkDisconnect();cleanup();}
}
async function requestState(){
  if(!connection)return;
  for(const type of ['REQUEST_HARDWARE','REQUEST_FACELETS','REQUEST_BATTERY'] as const){
    log(`Sending ${type}`);await connection.sendCubeCommand({type});
  }
}
button('connect').onclick=async()=>{
  if(busy||connection)return;
  const native=transport.value==='bridge';
  cancelRequested=false;
  if(!native&&!navigator.bluetooth){status('Web Bluetooth unavailable','Use Local bridge or open this test page in Microsoft Edge or Google Chrome.');return;}
  if(native&&!bridgeDevices.value){status('Select a native device','Press Scan native Bluetooth, then select your cube.');return;}
  const address=mac.value.trim().toUpperCase();
  if(address&&!/^(?:[0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(address)){status('Invalid MAC format','Use six hexadecimal pairs separated by colons.');return;}
  busy=true;ready=false;controls();log(`Connect pressed. Transport=${native?'native bridge':'Web Bluetooth'}; no automatic retries.`);status(native?'Connecting with native Windows Bluetooth':'Choose the cube',native?'The bridge owns service discovery and GAN decoding.':'Waiting for the browser picker and MAC resolution.');
  restoreGatt();
  device?.removeEventListener('gattserverdisconnected',onLinkDisconnect);device=null;
  try{
    releaseLease=await acquireConnectionLease();
    const conn=native?await connectNativeBridge(bridgeDevices.value,address||undefined):await connectGanCube(async(selected,fallback)=>{
      device=selected;
      if(!fallback){selected.addEventListener('gattserverdisconnected',onLinkDisconnect);log(`Selected ${selected.name??'(unnamed)'}; GATT connected=${selected.gatt?.connected}; watchAdvertisements=${typeof selected.watchAdvertisements}`);element('device').textContent=`Device: ${selected.name??'(unnamed)'}`;if(selected.gatt)restoreTrace=configureGanGatt(selected.gatt,log);}
      const fixedMac=knownCubeMac(selected.name);
      if(fixedMac){log('Using hardcoded owner-provided MAC for configured cube (value omitted from log)');status('Connecting GATT and discovering services','Configured cube address loaded; no advertisement lookup or address prompt.');return fixedMac;}
      if(address){log('Using explicitly entered MAC (value omitted from log)');status('Connecting GATT and discovering services','MAC supplied; the upstream library now owns service selection and notification setup.');return address;}
      if(!fallback){log('Trying upstream advertisement MAC lookup');status('Resolving cube MAC','The upstream advertisement lookup may take up to 10 seconds.');return null;}
      log('Advertisement MAC unavailable. No browser prompt used.');
      throw new Error('Enter the cube MAC in the address field above and press Connect cube again, or choose Local bridge to obtain it natively.');
    });
    if(cancelRequested){await conn.disconnect();throw new Error('Connection cancelled');}
    connection=conn;log('Driver created and notifications subscribed');
    element('device').textContent=`Device: ${conn.deviceName}`;
    subscription=conn.events$.subscribe({next:onEvent,error:error=>{log(`Stream error: ${errorText(error)}`);status('Stream error',errorText(error));void stop();},complete:()=>{log('Driver stream completed');cleanup();}});
    status('Connected · waiting for decoded state','Requesting hardware, facelets and battery in maintainer example order.');
    verificationTimer=setTimeout(()=>{if(!ready&&connection){log('No valid decoded snapshot within 12 seconds');status('GATT open · decoded state missing','Possible MAC/protocol/notification failure. Download the log. Disconnect when finished.');}},12000);
    await requestState();
    // Discovery already logged the selected UUID. Do not repeat an unfiltered
    // service enumeration after the connection has become usable.
  }catch(error){
    log(`Connection failed: ${errorText(error)}`);
    await stop();
    status('Connection failed',`${errorText(error)}. Download the log to preserve this attempt.`);
  }finally{restoreGatt();busy=false;if(!connection)releaseIdleLease();controls();}
};
async function stop(){
  const wasBusy=busy;busy=true;
  const previous=connection;cleanup();
  try{await previous?.disconnect();}catch(error){log(`Disconnect cleanup: ${errorText(error)}`);}
  if(device?.gatt?.connected)device.gatt.disconnect();
  busy=wasBusy;releaseIdleLease();controls();
}
button('disconnect').onclick=async()=>{cancelRequested=true;log('Manual disconnect / cancel');await stop();status(busy?'Cancellation requested':'Disconnected',busy?'The selected GATT link was closed. Waiting for the browser operation to settle; no new attempt will start automatically.':'No automatic reconnection. The cube may return to sleep.');};
button('refresh').onclick=()=>void requestState().catch(error=>{log(`Request failed: ${errorText(error)}`);status('Request failed',errorText(error));});
button('clear').onclick=()=>{lines=[];moves=[];turns=0;lastSerial=null;element('log').textContent='';element('moves').textContent='';element('last-move').textContent='—';element('move-info').textContent='Waiting for decoded MOVE events';element('count').textContent='Turns received: 0';};
button('export').onclick=()=>{
  const text=['GAN BLE standalone lab · gan-web-bluetooth 3.0.2',`Browser: ${navigator.userAgent}`,...lines].join('\n');
  const url=URL.createObjectURL(new Blob([text],{type:'text/plain'})),a=document.createElement('a');a.href=url;a.download='gan-ble-lab.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
const poll=setInterval(()=>{element('link').textContent=transport.value==='bridge'?`Native link: ${connection?'connected through bridge':'not connected'}`:`GATT: ${device?device.gatt?.connected?'connected':'disconnected':'not selected'}`;controls();},250);
window.addEventListener('pagehide',()=>{clearInterval(poll);if(device?.gatt?.connected)device.gatt.disconnect();});
log(`Lab loaded. Web Bluetooth ${navigator.bluetooth?'available':'unavailable'}. No connection attempted.`);
log('Connection build: targeted-services-v1; fixed cube MAC; no unfiltered discovery or automatic reconnects.');
log(`Browser: ${navigator.userAgent}`);
transport.onchange=()=>{element('native-controls').hidden=transport.value!=='bridge';status('Transport selected',transport.value==='bridge'?'Press Scan native Bluetooth when ready. This bypasses browser Bluetooth; the local bridge must be running.':'Queries supported GAN service UUIDs directly; no unfiltered enumeration or automatic reconnects.');};
button('scan').onclick=async()=>{
  if(busy||connection)return;busy=true;controls();log('User requested native scan');status('Scanning native Bluetooth','Scanning for 5 seconds through the local bridge…');
  try{
    releaseLease=await acquireConnectionLease();
    const devices=await scanBridge();bridgeDevices.replaceChildren(new Option('Select a cube',''));
    for(const found of devices)bridgeDevices.add(new Option(`${found.name} · ${found.rssi} dBm${found.mac?' · address detected':''}`,found.id));
    log(`Native scan found ${devices.length} cube(s)`);status(devices.length?'Select a cube, then Connect cube':'No cubes found','Native scan finished; no device has been connected.');
  }catch(error){log(`Native scan failed: ${errorText(error)}`);status('Native scan failed',errorText(error));}
  finally{busy=false;releaseIdleLease();controls();}
};
window.addEventListener('unhandledrejection',event=>log(`Unhandled decoder/runtime rejection: ${errorText(event.reason)}`));
window.addEventListener('error',event=>log(`Runtime error: ${event.message}`));
