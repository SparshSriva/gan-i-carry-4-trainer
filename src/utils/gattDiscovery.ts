/** Bounded exponential reconnects, as in Chromium's Automatic Reconnect sample. */
export function stabilizeGattDiscovery(
  gatt:BluetoothRemoteGATTServer,
  progress:(message:string)=>void=()=>{},
  delay:(ms:number)=>Promise<void>=ms=>new Promise(resolve=>setTimeout(resolve,ms)),
):()=>void {
  const original=gatt.getPrimaryServices,connect=gatt.connect;
  async function attempt<T>(operation:()=>Promise<T>):Promise<T> {
    for(let attempt=0;attempt<3;attempt++){
      try {
        if(attempt){
          const wait=2000*2**(attempt-1);
          progress(`Retrying GATT setup (${attempt+1}/3) in ${wait/1000}s…`);
          if(gatt.connected)gatt.disconnect();await delay(wait);
        }
        return await operation();
      }catch(error){
        const e=error as {name?:string;message?:string};
        const transient=e.name==='NetworkError' || /disconnected|GATT|connection/i.test(e.message??'');
        if(!transient || e.name==='SecurityError' || e.name==='NotAllowedError' || attempt===2)throw error;
      }
    }
    throw new Error('Bluetooth GATT setup failed.');
  }
  gatt.connect=()=>attempt(()=>{progress('Connecting to selected cube GATT server…');return connect.call(gatt);});
  gatt.getPrimaryServices=service=>attempt(async()=>{
    if(!gatt.connected)await connect.call(gatt);
    progress('Reading cube Bluetooth services…');
    const services=await original.call(gatt,service);
    const supported=['6e400001-b5a3-f393-e0a9-e50e24dc4179','8653000a-43e6-47b7-9cb0-5fc21d4ae340','00000010-0000-fff7-fff6-fff5fff4fff0'];
    const generation=services.map(s=>supported.indexOf(s.uuid.toLowerCase())).find(i=>i>=0);
    if(generation!==undefined)progress(`GAN Gen${generation+2} service found; setting up notifications…`);
    return services;
  });
  return()=>{gatt.getPrimaryServices=original;gatt.connect=connect;};
}
