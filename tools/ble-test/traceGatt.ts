/** Observe the reference path without retries, extra BLE calls, or result changes. */
export function traceGatt(gatt:BluetoothRemoteGATTServer,log:(line:string)=>void):()=>void {
  const connect=gatt.connect,discover=gatt.getPrimaryServices;
  gatt.connect=async()=>{
    const start=performance.now();log(`gatt.connect BEGIN connected=${gatt.connected}`);
    try{const server=await connect.call(gatt);log(`gatt.connect RESOLVED after ${Math.round(performance.now()-start)}ms connected=${gatt.connected}; returned.connected=${server.connected}`);return server;}
    catch(error){log(`gatt.connect REJECTED connected=${gatt.connected}: ${describe(error)}`);throw error;}
  };
  gatt.getPrimaryServices=async service=>{
    const start=performance.now();log(`getPrimaryServices BEGIN connected=${gatt.connected}`);
    try{const services=await discover.call(gatt,service);log(`getPrimaryServices RESOLVED after ${Math.round(performance.now()-start)}ms connected=${gatt.connected}: ${services.map(s=>s.uuid).join(', ')||'none'}`);return services;}
    catch(error){log(`getPrimaryServices REJECTED after ${Math.round(performance.now()-start)}ms connected=${gatt.connected}: ${describe(error)}`);throw error;}
  };
  return()=>{gatt.connect=connect;gatt.getPrimaryServices=discover;};
}
function describe(error:unknown){return error instanceof Error?`${error.name}: ${error.message}`:String(error);}
