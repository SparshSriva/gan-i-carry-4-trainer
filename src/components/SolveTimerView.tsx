import { useState, useEffect, useRef } from 'react';
import type { SolveTimerState } from '../hooks/useSolveTimer';
import type { GripOrientation } from '../utils/gripOrientation';
import type { SolveRecord } from '../utils/solveSession';
import { solveSummary } from '../utils/solveSession';
import { generateOfficialScramble } from '../utils/officialScramble';
import type { ScrambleProvenance } from '../utils/officialScramble';
import { parseAlg } from '../utils/moveUtils';
import CubeCanvas from './CubeCanvas';
import ScrambleStrip from './ScrambleStrip';

interface Props { timer:SolveTimerState; simulator:boolean; connected:boolean; grip:GripOrientation; onGripChange:(g:GripOrientation)=>void }
export default function SolveTimerView({timer,simulator,connected,grip,onGripChange}:Props){
  const [scramble,setScramble]=useState(''),[manual,setManual]=useState(false),[replay,setReplay]=useState<SolveRecord|null>(null),[step,setStep]=useState(0);
  const [generating,setGenerating]=useState(false),[generationError,setGenerationError]=useState(''),[provenance,setProvenance]=useState<ScrambleProvenance>({kind:'custom'});
  const alive=useRef(true),generationSeq=useRef(0);
  const summary=solveSummary(timer.history);
  const format=(ms:number|'DNF'|null)=>ms===null?'—':ms==='DNF'?'DNF':`${(ms/1000).toFixed(2)}s`;
  const s=timer.session,active=Boolean(s && s.phase!=='review');
  const generate=async(begin=false)=>{
    const request=++generationSeq.current;
    setGenerating(true);setGenerationError('');
    try{const result=await generateOfficialScramble();if(!alive.current || request!==generationSeq.current)return;setScramble(result.scramble);setProvenance(result.provenance);setReplay(null);if(begin)timer.begin(result.scramble,manual,result.provenance);}
    catch(e){if(alive.current && request===generationSeq.current)setGenerationError(e instanceof Error?e.message:'Scramble generation failed.');}
    finally{if(alive.current && request===generationSeq.current)setGenerating(false);}
  };
  const generateRef=useRef(generate);generateRef.current=generate;
  useEffect(()=>{alive.current=true;void generateRef.current();return()=>{alive.current=false;};},[]);
  const next=()=>void generate(true);
  const exportRecords=()=>{const blob=new Blob([JSON.stringify({schemaVersion:1,exportedAt:new Date().toISOString(),solves:timer.history},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='gan-i4-solves.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const replayMoves=replay?[...parseAlg(replay.scramble),...replay.solution.slice(0,step).map(m=>m.move)]:timer.moveHistory;
  return <section className="h-full overflow-y-auto p-4 space-y-4">
    <div><h1 className="text-xl font-bold">Solve timer</h1><p className="text-sm text-zinc-400">Save scrambles and timestamped solutions for reconstruction and future analysis.</p></div>
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="space-y-3 max-w-[600px] w-full order-2 lg:order-1">
        <CubeCanvas moveHistory={replayMoves} view="3d" grip={replay?.startingGrip??grip} onGripChange={onGripChange} gripLocked={active || Boolean(replay)} interactive={!replay && simulator && active} onLayerClick={timer.feed}/>
      </div>
      <div className="space-y-4 order-1 lg:order-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-center">
          <p role="status" className="text-sm text-indigo-300">{replay?'Replay':s?.phase==='scrambling'?'Follow the scramble':s?.phase==='ready'?s.source==='manual'?'Ready — press Space to start':'Ready — first turn starts the clock':s?.phase==='solving'?'Solving':s?.phase==='review'?s.result?.termination==='dnf'?'Interrupted · DNF':'Saved':'Choose a scramble to begin'}</p>
          <p className="font-mono text-5xl sm:text-6xl my-4 tabular-nums">{((replay?.durationMs??timer.elapsed)/1000).toFixed(2)}<span className="text-lg text-zinc-500">s</span></p>
          {s?.source==='manual' && s.phase!=='scrambling' && s.phase!=='review' && <button onClick={timer.toggleManual} className="bg-indigo-600 rounded-lg px-5 py-2">{s.phase==='ready'?'Start timer (Space)':'Stop and save (Space)'}</button>}
          {active && <button onClick={timer.interrupt} className="block mx-auto mt-3 text-xs text-zinc-400">Cancel{ s?.phase==='solving'?' and save DNF':''}</button>}
        </div>
        {!active && !replay && <div className="space-y-3 rounded-xl bg-zinc-900 border border-zinc-800 p-4">
          <label className="flex gap-2 text-sm"><input type="checkbox" disabled={generating} checked={manual} onChange={e=>setManual(e.target.checked)}/>Manual timer (no move capture)</label>
          <label className="block text-xs text-zinc-400">Scramble<textarea aria-label="Solve scramble" value={scramble} onChange={e=>{setScramble(e.target.value);setProvenance({kind:'custom'});}} className="w-full mt-2 bg-zinc-950 rounded-lg p-3 font-mono text-sm" /></label>
          <p className="text-xs text-zinc-500">{generating?'Generating official 3×3 scramble…':provenance.kind==='tnoodle-wca'?`TNoodle-WCA ${provenance.version} · official program · 3×3 random-state`:'Pasted/custom scramble — source not verified.'}</p>
          {provenance.kind==='tnoodle-wca' && <p className="text-xs text-zinc-400">For standard scramble application, choose White up / Green front. Other grips apply this sequence relative to your selected faces.</p>}
          <div className="flex gap-2"><button disabled={generating || !scramble.trim() || !timer.ready || (!manual && !simulator && !connected)} onClick={()=>{setReplay(null);timer.begin(scramble,manual,provenance);}} className="bg-indigo-600 disabled:opacity-40 rounded-lg px-4 py-2 text-sm">Use scramble</button><button disabled={generating || !timer.ready || (!manual && !simulator && !connected)} onClick={next} className="rounded-lg bg-zinc-800 px-4 py-2 text-sm disabled:opacity-40">New official scramble</button></div>
        </div>}
        {s?.phase==='scrambling' && !replay && <><p className="text-xs text-zinc-400">Start with a solved cube. Notation is relative to your selected up/front faces.</p><ScrambleStrip snap={s.assistant.snapshot()}/>{s.source!=='gan' && <button onClick={timer.confirmSetup} className="text-sm rounded-lg bg-zinc-800 px-4 py-2">{s.source==='manual'?'I have scrambled my cube':'Apply scramble in simulator'}</button>}</>}
        {generationError && <p role="alert" className="text-sm text-amber-400">{generationError}<button onClick={()=>void generate()} className="ml-2 text-indigo-300">Retry generation</button></p>}
        {timer.error && <p role="alert" className="text-sm text-amber-400">{timer.error}</p>}
        {s?.result && !replay && <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-2"><h2 className="font-semibold">Saved solution</h2><p className="font-mono text-sm break-words">{s.result.solution.map(m=>m.move).join(' ')||'No move reconstruction captured (manual timing).'}</p><p className="text-xs text-zinc-400">{s.result.solution.length} events · {s.result.solved?'Solved state verified':'Completion was not verified'} · {(s.result.inspectionMs/1000).toFixed(2)}s inspection</p></div>}
        {replay && <div className="bg-zinc-900 rounded-xl p-4 space-y-2"><h2 className="font-semibold">Solution replay</h2><p className="text-xs text-zinc-400">Recorded scramble</p><p className="font-mono text-sm">{replay.scramble}</p><input aria-label="Replay move" type="range" min="0" max={replay.solution.length} value={step} onChange={e=>setStep(Number(e.target.value))} className="w-full"/><p className="text-xs text-zinc-400">{step}/{replay.solution.length} moves · {step?`${replay.solution[step-1].elapsedMs} ms`: 'Scrambled state'}</p><p className="font-mono text-sm">{replay.solution.map(m=>m.move).join(' ')||'Manual time only; no solution events.'}</p><button onClick={()=>setReplay(null)} className="text-xs text-indigo-300">Return to timer</button></div>}
        <div className="grid grid-cols-4 gap-2">{([['Best',summary.bestMs],['Mean',summary.meanMs],['ao5',summary.ao5],['ao12',summary.ao12]] as const).map(([label,value])=><div key={label} className="bg-zinc-900 border border-zinc-800 p-2 rounded-lg"><p className="text-xs text-zinc-500">{label}</p><p className="font-mono text-sm mt-1">{format(value)}</p></div>)}</div>
        <p className="text-[11px] text-zinc-500">Mean excludes DNF. Rolling averages trim the fastest and slowest result. No +2 penalties are applied.</p>
        <div className="flex justify-between items-center"><h2 className="font-semibold">Solve history ({timer.history.length})</h2><button onClick={exportRecords} disabled={!timer.history.length} className="text-xs text-indigo-300 disabled:opacity-40">Export JSON</button></div>
        <div className="space-y-2">{timer.history.slice(-20).reverse().map(r=><button key={r.id} disabled={active} onClick={()=>{setReplay(r);setStep(r.solution.length);}} className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-lg p-3 disabled:opacity-40"><span className="font-mono">{r.termination==='dnf'?'DNF':`${(r.durationMs/1000).toFixed(2)}s`}</span><span className="text-xs text-zinc-500 ml-3">{new Date(r.createdAt).toLocaleString()} · {r.source} · {r.solution.length} events</span><p className="font-mono text-xs text-zinc-400 mt-1 truncate">{r.scramble}</p></button>)}</div>
      </div>
    </div>
  </section>;
}
