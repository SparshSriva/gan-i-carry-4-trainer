import { Subject } from 'rxjs';
import type { GanCubeConnection, GanCubeEvent, GanCubeCommand } from 'gan-web-bluetooth';
export interface BridgeDevice {id:string;name:string;mac:string|null;rssi:number}
async function request(path:string,body?:unknown,lease?:string) {
  try {
    const response=await fetch(`/api/bridge${path}`,{method:body===undefined?'GET':'POST',headers:{'X-Cube-Bridge':'1',...(body===undefined?{}:{'Content-Type':'application/json'}),...(lease?{Authorization:`Bearer ${lease}`}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(45000)});
    const data=await response.json();if(!response.ok)throw new Error(data.error??'Local bridge request failed.');return data;
  }catch(error){throw new Error(error instanceof SyntaxError?'Local bridge is unavailable. Run npm run setup:bridge, then npm run bridge.':error instanceof Error?error.message:'Local bridge request failed.');}
}
let pendingScan:Promise<BridgeDevice[]>|null=null;
export function scanBridge():Promise<BridgeDevice[]> {
  if(!pendingScan)pendingScan=request('/scan',{}).then(data=>data.devices).finally(()=>{pendingScan=null;});
  return pendingScan;
}
export async function connectNativeBridge(deviceId:string,mac?:string):Promise<GanCubeConnection> {
  const data=await request('/connect',{deviceId,mac});
  const events$=new Subject<GanCubeEvent>();let cursor=data.cursor,closed=false;
  const disconnect=async()=>{if(closed)return;closed=true;await request('/disconnect',{},data.lease).catch(()=>{});events$.complete();};
  const poll=async()=>{
    while(!closed){
      try {
        const batch=await request(`/events?since=${cursor}`,undefined,data.lease);
        for(const item of batch.events){
          if(item.sequence!==cursor+1)throw new Error('Bridge events are missing. Reconnect from a solved cube.');
          cursor=item.sequence;
          if(item.event.type==='BRIDGE_ERROR')throw new Error(item.event.message);
          events$.next(item.event);
          if(item.event.type==='DISCONNECT'){await disconnect();return;}
        }
        if(batch.cursor!==cursor)throw new Error('Bridge cursor mismatch. Reconnect from solved.');
      }catch(error){if(!closed){events$.error(error);await disconnect();}return;}
      await new Promise(resolve=>setTimeout(resolve,100));
    }
  };
  // Start after the manager has subscribed to the returned stream.
  setTimeout(()=>void poll(),0);
  return {deviceName:data.deviceName,deviceMAC:mac??'',events$,sendCubeCommand:async(command:GanCubeCommand)=>{await request('/command',command,data.lease);},disconnect};
}
