/** A lab connection owns the origin's BLE lock until explicit cleanup. */
export async function acquireConnectionLease():Promise<()=>void> {
  if(!navigator.locks)throw new Error('This test requires browser Web Locks support to prevent overlapping cube attempts. Use a current Edge or Chrome.');
  return new Promise((resolve,reject)=>{
    navigator.locks.request('gan-ble-lab-connection',{ifAvailable:true},async lock=>{
      if(!lock){reject(new Error('Another BLE lab tab is scanning or connected. Disconnect or close that tab before retrying.'));return;}
      await new Promise<void>(release=>resolve(release));
    }).catch(reject);
  });
}
