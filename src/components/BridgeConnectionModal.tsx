import { useEffect, useState } from 'react';
import { scanBridge } from '../utils/nativeBridge';
import type { BridgeDevice } from '../utils/nativeBridge';
import { knownCubeMac } from '../utils/knownCube.mjs';
export default function BridgeConnectionModal({onClose,onConnect,connecting}:{onClose:()=>void;onConnect:(id:string,mac?:string)=>void;connecting:boolean}){
  const [devices,setDevices]=useState<BridgeDevice[]>([]),[scanning,setScanning]=useState(false),[error,setError]=useState(''),[mac,setMac]=useState('');
  const [selected,setSelected]=useState('');
  const scan=async()=>{setScanning(true);setError('');try{setDevices(await scanBridge());setSelected('');}catch(e){setError(e instanceof Error?e.message:'Scan failed');}finally{setScanning(false);}};
  useEffect(()=>{let alive=true;setScanning(true);scanBridge().then(d=>{if(alive)setDevices(d);}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setScanning(false);});return()=>{alive=false;};},[]);
  const device=devices.find(d=>d.id===selected);
  const resolvedMac=knownCubeMac(device?.name)??device?.mac;
  return <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"><section role="dialog" aria-modal="true" aria-label="Local Bluetooth bridge" className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-xl p-5 space-y-4">
    <div className="flex justify-between"><h2 className="font-semibold">Local Bluetooth bridge</h2><button disabled={connecting} aria-label="Close bridge connection" onClick={onClose}>×</button></div>
    <p className="text-sm text-zinc-400">Run <code>npm run setup:bridge</code> once, then <code>npm run bridge</code> in another terminal. Wake your cube and close other cube-connected apps. The bridge handles Bluetooth without browser flags.</p>
    <button disabled={scanning || connecting} onClick={()=>void scan()} className="bg-zinc-800 px-3 py-2 rounded disabled:opacity-40">{scanning?'Scanning…':'Scan for cubes'}</button>
    <label className="block text-sm">Cube<select aria-label="Bridge cube" disabled={scanning || connecting} value={selected} onChange={e=>setSelected(e.target.value)} className="block w-full p-2 bg-zinc-950 border border-zinc-700 rounded mt-1"><option value="">Choose a discovered cube</option>{devices.map(d=><option key={d.id} value={d.id}>{d.name} · {d.rssi} dBm{d.mac?' · address detected':' · address needed'}</option>)}</select></label>
    {!scanning && !devices.length && !error && <p className="text-sm text-zinc-400">No GAN cubes found. Wake the cube and scan again.</p>}
    {device && !resolvedMac && <label className="block text-xs text-zinc-400">Cube MAC was not advertised. Enter the actual address:<input aria-label="Bridge cube MAC" value={mac} onChange={e=>setMac(e.target.value)} placeholder="AB:12:34:56:78:90" className="block w-full bg-zinc-950 p-2 rounded mt-1"/></label>}
    {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
    <button disabled={connecting || scanning || !device || !resolvedMac && !/^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(mac.trim())} onClick={()=>onConnect(selected,resolvedMac??mac.trim().toUpperCase())} className="bg-indigo-600 px-4 py-2 rounded disabled:opacity-40">{connecting?'Connecting…':'Connect via bridge'}</button>
  </section></div>;
}
