import { connectGanCube } from 'gan-web-bluetooth';
import type { GanCubeConnection, GanCubeEvent } from 'gan-web-bluetooth';
import type { Subscription } from 'rxjs';

const element=(id:string)=>document.getElementById(id)!;
const button=(id:string)=>element(id) as HTMLButtonElement;
const mac=element('mac') as HTMLInputElement;
let connection:GanCubeConnection|null=null,subscription:Subscription|null=null,device:BluetoothDevice|null=null;
let busy=false,ready=false,turns=0,lastSerial:number|null=null,verificationTimer:ReturnType<typeof setTimeout>|undefined;
let lines:string[]=[],moves:string[]=[];
const started=performance.now();
function log(message:string){
  lines.push(`${new Date().toISOString()} +${Math.round(performance.now()-started)}ms ${message}`);
  lines=lines.slice(-1000);element('log').textContent=lines.join('\n');element('log').scrollTop=element('log').scrollHeight;
}
function status(title:string,detail:string){element('status').textContent=title;element('detail').textContent=detail;}
function controls(){button('connect').disabled=busy||!!connection;button('disconnect').disabled=busy||!connection;button('refresh').disabled=busy||!connection;mac.disabled=busy||!!connection;}
function errorText(error:unknown){return error instanceof Error?`${error.name}: ${error.message}`:String(error);}
function cleanup(){clearTimeout(verificationTimer);subscription?.unsubscribe();subscription=null;connection=null;ready=false;controls();}
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
  if(!navigator.bluetooth){status('Web Bluetooth unavailable','Open this test page in Microsoft Edge or Google Chrome.');return;}
  const address=mac.value.trim().toUpperCase();
  if(address&&!/^(?:[0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(address)){status('Invalid MAC format','Use six hexadecimal pairs separated by colons.');return;}
  busy=true;ready=false;controls();log('Connect pressed. Using upstream connectGanCube directly; no app GATT overrides or retries.');status('Choose the cube','Waiting for the browser picker and MAC resolution.');
  device?.removeEventListener('gattserverdisconnected',onLinkDisconnect);device=null;
  try{
    const conn=await connectGanCube(async(selected,fallback)=>{
      device=selected;
      if(!fallback){selected.addEventListener('gattserverdisconnected',onLinkDisconnect);log(`Selected ${selected.name??'(unnamed)'}; GATT connected=${selected.gatt?.connected}`);element('device').textContent=`Device: ${selected.name??'(unnamed)'}`;}
      if(address){log('Using explicitly entered MAC (value omitted from log)');status('Connecting GATT and discovering services','MAC supplied; the upstream library now owns service selection and notification setup.');return address;}
      if(!fallback){log('Trying upstream advertisement MAC lookup');status('Resolving cube MAC','The upstream advertisement lookup may take up to 10 seconds.');return null;}
      const entered=window.prompt('Advertisements did not provide a MAC. Enter the cube hardware MAC from Edge Bluetooth Internals:');
      if(!entered)return null;
      const value=entered.trim().toUpperCase();if(!/^(?:[0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(value))throw new Error('Invalid MAC format');mac.value=value;log('Using fallback MAC (value omitted from log)');return value;
    });
    connection=conn;log('Driver created and notifications subscribed');
    subscription=conn.events$.subscribe({next:onEvent,error:error=>{log(`Stream error: ${errorText(error)}`);status('Stream error',errorText(error));void stop();},complete:()=>{log('Driver stream completed');cleanup();}});
    status('Connected · waiting for decoded state','Requesting hardware, facelets and battery in maintainer example order.');
    verificationTimer=setTimeout(()=>{if(!ready&&connection){log('No valid decoded snapshot within 12 seconds');status('GATT open · decoded state missing','Possible MAC/protocol/notification failure. Download the log. Disconnect when finished.');}},12000);
    await requestState();
    // Observe actual services only after the library has finished initialization.
    try{
      const selected=device as BluetoothDevice|null;
      const services=await selected?.gatt?.getPrimaryServices();
      for(const service of services??[])log(`Service ${service.uuid}`);
    }catch(error){log(`Diagnostic service enumeration failed: ${errorText(error)}`);}
  }catch(error){
    log(`Connection failed: ${errorText(error)}`);
    await stop();
    status('Connection failed',`${errorText(error)}. Download the log to preserve this attempt.`);
  }finally{busy=false;controls();}
};
async function stop(){
  const wasBusy=busy;busy=true;
  const previous=connection;cleanup();
  try{await previous?.disconnect();}catch(error){log(`Disconnect cleanup: ${errorText(error)}`);}
  if(device?.gatt?.connected)device.gatt.disconnect();busy=wasBusy;controls();
}
button('disconnect').onclick=async()=>{log('Manual disconnect');await stop();status('Disconnected','No automatic reconnection. The cube may return to sleep.');};
button('refresh').onclick=()=>void requestState().catch(error=>{log(`Request failed: ${errorText(error)}`);status('Request failed',errorText(error));});
button('clear').onclick=()=>{lines=[];moves=[];turns=0;lastSerial=null;element('log').textContent='';element('moves').textContent='';element('last-move').textContent='—';element('move-info').textContent='Waiting for decoded MOVE events';element('count').textContent='Turns received: 0';};
button('export').onclick=()=>{
  const text=['GAN BLE standalone lab · gan-web-bluetooth 3.0.2',`Browser: ${navigator.userAgent}`,...lines].join('\n');
  const url=URL.createObjectURL(new Blob([text],{type:'text/plain'})),a=document.createElement('a');a.href=url;a.download='gan-ble-lab.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
const poll=setInterval(()=>{element('link').textContent=`GATT: ${device?device.gatt?.connected?'connected':'disconnected':'not selected'}`;},250);
window.addEventListener('pagehide',()=>{clearInterval(poll);if(device?.gatt?.connected)device.gatt.disconnect();});
log(`Lab loaded. Web Bluetooth ${navigator.bluetooth?'available':'unavailable'}. No connection attempted.`);
window.addEventListener('unhandledrejection',event=>log(`Unhandled decoder/runtime rejection: ${errorText(event.reason)}`));
window.addEventListener('error',event=>log(`Runtime error: ${event.message}`));
