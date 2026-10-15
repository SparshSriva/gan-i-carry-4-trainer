export const GAN_SERVICES=[
  {generation:3,uuid:'8653000a-43e6-47b7-9cb0-5fc21d4ae340'},
  {generation:4,uuid:'00000010-0000-fff7-fff6-fff5fff4fff0'},
  {generation:2,uuid:'6e400001-b5a3-f393-e0a9-e50e24dc4179'},
] as const;

/** Query known GAN services directly; one explicit connection, no retries.
 * Prefer the reported i Carry family profile, but select only the actual UUID.
 * The maintained GAN library still owns characteristics and packet decoding.
 */
export function configureGanGatt(
  gatt:BluetoothRemoteGATTServer,
  progress:(message:string)=>void=()=>{},
):()=>void {
  const discover=gatt.getPrimaryServices,connect=gatt.connect;
  gatt.connect=async()=>{
    const start=performance.now();progress(`gatt.connect BEGIN connected=${gatt.connected}`);
    try{
      const server=await connect.call(gatt);
      progress(`gatt.connect RESOLVED after ${Math.round(performance.now()-start)}ms connected=${server.connected}`);
      return server;
    }catch(error){progress(`gatt.connect REJECTED: ${describe(error)}`);throw error;}
  };
  gatt.getPrimaryServices=async service=>{
    if(service!==undefined)return discover.call(gatt,service);
    if(!gatt.connected)throw new Error('Cube GATT link closed before targeted service discovery.');
    for(const candidate of GAN_SERVICES){
      const start=performance.now();
      progress(`Querying GAN Gen${candidate.generation} service ${candidate.uuid} (connected=${gatt.connected})…`);
      try{
        const found=await gatt.getPrimaryService(candidate.uuid);
        if(!gatt.connected)throw new Error('Cube disconnected while returning its GAN service.');
        if(found.uuid.toLowerCase()!==candidate.uuid)throw new Error('Cube transport returned a different service UUID than requested.');
        progress(`GAN Gen${candidate.generation} service verified in ${Math.round(performance.now()-start)}ms; setting up notifications…`);
        return [found];
      }catch(error){
        progress(`GAN Gen${candidate.generation} service query failed after ${Math.round(performance.now()-start)}ms (connected=${gatt.connected}): ${describe(error)}`);
        // Only absence permits querying another profile on the same live link.
        if(!gatt.connected || (error as {name?:string}).name!=='NotFoundError')throw error;
      }
    }
    throw new Error('No supported GAN Gen2, Gen3 or Gen4 service was found on the connected cube.');
  };
  return()=>{gatt.getPrimaryServices=discover;gatt.connect=connect;};
}
function describe(error:unknown){return error instanceof Error?`${error.name}: ${error.message}`:String(error);}
