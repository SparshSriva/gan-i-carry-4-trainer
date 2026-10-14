/** Verify notification/decryption readiness, following the maintainer's request order. */
export async function initializeCubeConnection(conn,progress=()=>{},timeoutMs=12000) {
  let subscription,timer;
  const facelets=new Promise((resolve,reject)=>{
    timer=setTimeout(()=>reject(new Error('Cube did not return a decoded facelet state. Check the cube MAC/address and protocol support; Bluetooth pairing alone is not readiness.')),timeoutMs);
    subscription=conn.events$.subscribe({
      next:event=>{
        if(event.type==='DISCONNECT')reject(new Error('Cube disconnected during initialization.'));
        if(event.type==='FACELETS'){
          const state=event.facelets;
          if(typeof state==='string' && /^[URFDLB]{54}$/.test(state) && [...'URFDLB'].every(face=>[...state].filter(c=>c===face).length===9))resolve(state);
          else reject(new Error('Cube returned an invalid facelet state; initialization refused.'));
        }
      },error:reject,complete:()=>reject(new Error('Cube stream ended during initialization.')),
    });
  });
  // A disconnect may reject while a native write is still awaiting its reply.
  void facelets.catch(()=>{});
  try {
    for(const type of ['REQUEST_HARDWARE','REQUEST_FACELETS','REQUEST_BATTERY']){
      progress(`Initializing cube: ${type.replace('REQUEST_','').toLowerCase()}…`);
      await conn.sendCubeCommand({type});
    }
    progress('Verifying decoded cube state…');
    const state=await facelets;progress('Cube notifications and decoded state verified.');return state;
  }finally{clearTimeout(timer);subscription?.unsubscribe();}
}
