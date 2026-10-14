import { useState } from 'react';
import type { AlgCase, TrainingSession, TrainingEntry, LearningStatus } from '../types';
import type { GripOrientation } from '../utils/gripOrientation';
import { entryKey } from '../utils/trainingSession';
import { FACE_LABELS } from '../utils/gripOrientation';
import { parseAlg } from '../utils/moveUtils';
import CaseDiagram from './CaseDiagram';
import CubeCanvas from './CubeCanvas';

export interface CaseSelectorProps {
  cases:AlgCase[]; session:TrainingSession; grip:GripOrientation;
  onGripChange:(g:GripOrientation)=>void; onSelect:(c:AlgCase)=>void; onNext:()=>void;
  onToggleEntry:(e:TrainingEntry)=>void; onAddEntries:(e:TrainingEntry[])=>void;
  onSelectionChange:(mode:TrainingSession['selection'])=>void; onSessionName:(name:string)=>void;
  onPreferVariant:(caseId:string,variantId:string)=>void;
  onStatusChange:(id:string,status:LearningStatus)=>void;
  onAddVariant:(id:string,label:string,alg:string)=>string|null;
}
function CatalogCard({c,props}:{c:AlgCase;props:CaseSelectorProps}){
  const [label,setLabel]=useState(''),[custom,setCustom]=useState(''),[error,setError]=useState('');
  const v=c.variants.find(v=>v.id===c.preferredVariantId)??c.variants[0];
  const entry={caseId:c.id,variantId:v.id},added=props.session.entries.some(e=>entryKey(e)===entryKey(entry));
  const stats=c.variantStats?.[v.id];
  return <article className={`rounded-xl border p-3 space-y-3 ${added?'border-indigo-500 bg-indigo-950/20':'border-zinc-800 bg-zinc-900'}`}>
    <div className="flex items-center gap-3"><CaseDiagram c={c}/><div className="min-w-0 flex-1"><p className="text-[10px] uppercase tracking-wider text-zinc-500">{c.subset} · {c.group}</p><h3 className="font-semibold text-sm mt-1">{c.name}</h3><p className="text-xs text-zinc-500 mt-1">{c.variants.length} variant{c.variants.length===1?'':'s'}</p></div>
      <input aria-label={`Add ${c.name} ${v.label} to session`} type="checkbox" checked={added} onChange={()=>props.onToggleEntry(entry)} className="w-4 h-4 accent-indigo-500 shrink-0"/>
    </div>
    <select aria-label={`${c.name} algorithm variant`} value={v.id} onChange={e=>props.onPreferVariant(c.id,e.target.value)} className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded-lg p-2">{c.variants.map(v=><option key={v.id} value={v.id}>{v.label} · {parseAlg(v.alg).length} moves</option>)}</select>
    <p className="font-mono text-xs leading-relaxed text-zinc-200 break-words min-h-10">{v.alg}</p>
    <div className="flex flex-wrap gap-1">{v.tags.map(tag=><span key={tag} className="text-[10px] bg-zinc-800 rounded px-2 py-0.5 text-zinc-400">{tag}</span>)}</div>
    <div className="flex justify-between gap-2"><select aria-label={`${c.name} learning status`} value={c.status} onChange={e=>props.onStatusChange(c.id,e.target.value as LearningStatus)} className="text-xs bg-zinc-800 rounded p-1.5"><option value="unlearned">Unlearned</option><option value="learning">Learning</option><option value="learned">Learned</option></select><button onClick={()=>props.onSelect(c)} className="text-xs text-indigo-300">Practice now</button></div>
    {stats && <p className="text-[11px] text-zinc-500">{stats.attempts} attempts on this variant · {(stats.avgExecutionMs/1000).toFixed(2)}s average</p>}
    <details className="text-xs text-zinc-400"><summary className="cursor-pointer">Alternates & personal algorithm</summary><div className="space-y-3 pt-3">{c.variants.map(alt=><div key={alt.id} className="space-y-1"><p className="text-zinc-300">{alt.label}{alt.id===v.id?' · preferred':''}</p><p className="font-mono text-[11px]">{alt.alg}</p><button onClick={()=>props.onToggleEntry({caseId:c.id,variantId:alt.id})} className="text-indigo-300">{props.session.entries.some(e=>e.caseId===c.id && e.variantId===alt.id)?'Remove from session':'Add variant to session'}</button></div>)}
      <input aria-label={`${c.name} personal variant name`} value={label} onChange={e=>setLabel(e.target.value)} placeholder="Personal variant name" className="w-full bg-zinc-950 rounded p-2"/><textarea aria-label={`${c.name} personal algorithm`} value={custom} onChange={e=>setCustom(e.target.value)} placeholder="Algorithm notation" className="w-full bg-zinc-950 rounded p-2 font-mono"/><button onClick={()=>{const message=props.onAddVariant(c.id,label,custom);setError(message??'');if(!message){setLabel('');setCustom('');}}} className="text-indigo-300">Save personal alternate</button>{error && <p role="alert" className="text-amber-300">{error}</p>}<p className="text-[10px] text-zinc-500">Personal alternates are notation-checked; case identity is your responsibility.</p>
      {c.sourceUrl && <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="block text-zinc-500">Reference source{c.sourcePage?` · PDF page ${c.sourcePage}`:''}</a>}
    </div></details>
  </article>;
}
export default function CaseSelector(props:CaseSelectorProps){
  const [subset,setSubset]=useState('OLL'),[group,setGroup]=useState('ALL'),[status,setStatus]=useState('ALL'),[query,setQuery]=useState(''),[outerOnly,setOuterOnly]=useState(false);
  const groups=[...new Set(props.cases.filter(c=>c.subset===subset).map(c=>c.group))];
  const visible=props.cases.filter(c=>c.subset===subset && (group==='ALL'||c.group===group) && (status==='ALL'||c.status===status) && `${c.name} ${c.group} ${c.variants.map(v=>v.alg).join(' ')}`.toLowerCase().includes(query.toLowerCase()) && (!outerOnly || c.variants.find(v=>v.id===c.preferredVariantId)?.tags.includes('Outer faces')));
  const shownGroups=groups.filter(g=>visible.some(c=>c.group===g));
  return <div className="grid xl:grid-cols-[minmax(0,1fr)_300px] gap-5 items-start">
    <div className="space-y-4 min-w-0">
      <div className="flex flex-wrap gap-2">{(['F2L','OLL','PLL'] as const).map(s=><button key={s} onClick={()=>{setSubset(s);setGroup('ALL');}} className={`px-4 py-2 rounded-lg text-sm ${subset===s?'bg-indigo-600':'bg-zinc-900 text-zinc-400'}`}>{s}<span className="ml-2 text-xs opacity-60">{props.cases.filter(c=>c.subset===s).length}</span></button>)}</div>
      <div className="flex flex-wrap gap-2"><input aria-label="Search trainer algorithms" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search cases, shapes, notation…" className="min-w-48 flex-1 rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm"/><select aria-label="Algorithm group" value={group} onChange={e=>setGroup(e.target.value)} className="rounded-lg bg-zinc-900 p-2 text-xs"><option value="ALL">All groups</option>{groups.map(g=><option key={g}>{g}</option>)}</select><select aria-label="Practice learning status" value={status} onChange={e=>setStatus(e.target.value)} className="rounded-lg bg-zinc-900 p-2 text-xs"><option value="ALL">All statuses</option><option value="unlearned">Unlearned</option><option value="learning">Learning</option><option value="learned">Learned</option></select></div>
      <div className="flex flex-wrap items-center justify-between gap-2"><label className="text-xs text-zinc-400 flex gap-2"><input type="checkbox" checked={outerOnly} onChange={e=>setOuterOnly(e.target.checked)}/>Outer-face variants only</label><button disabled={!visible.length} onClick={()=>props.onAddEntries(visible.map(c=>({caseId:c.id,variantId:c.preferredVariantId})))} className="text-xs text-indigo-300 disabled:opacity-40">Add {visible.length} visible algorithms to session</button></div>
      {!visible.length && <p className="text-zinc-400 p-6 bg-zinc-900 rounded-xl">No matching cases. Adjust your search or filters.</p>}
      {shownGroups.map(g=><section key={g} className="space-y-3"><div className="flex gap-2 items-center border-b border-zinc-800 pb-2"><h2 className="text-sm font-semibold">{g}</h2><span className="text-xs text-zinc-500">{visible.filter(c=>c.group===g).length} cases</span></div><div className="grid md:grid-cols-2 2xl:grid-cols-3 gap-3">{visible.filter(c=>c.group===g).map(c=><CatalogCard key={c.id} c={c} props={props}/>)}</div></section>)}
    </div>
    <aside className="space-y-3 xl:sticky xl:top-0 bg-zinc-900 border border-zinc-800 rounded-xl p-4 order-first xl:order-last">
      <label className="text-xs text-zinc-500">Training session<input aria-label="Training session name" value={props.session.name} onChange={e=>props.onSessionName(e.target.value)} className="w-full text-sm text-white bg-zinc-950 p-2 rounded-lg mt-1"/></label>
      <p className="text-sm">{props.session.entries.length} selected algorithm variants</p>
      <select aria-label="Training selection mode" value={props.session.selection} onChange={e=>props.onSelectionChange(e.target.value as TrainingSession['selection'])} className="w-full bg-zinc-800 rounded-lg p-2 text-xs"><option value="balanced">Balanced · each variant once per cycle</option><option value="weighted">Adaptive · prioritize slow / difficult variants</option></select>
      <button disabled={!props.session.entries.length} onClick={props.onNext} className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 p-3 font-semibold text-sm">Start training session</button>
      {!props.session.entries.length && <p className="text-xs text-zinc-500">Select a case’s checkbox or add a group to build your session. You can train multiple alternates of one case.</p>}
      <div className="max-h-64 overflow-y-auto space-y-2">{props.session.entries.map(e=>{const c=props.cases.find(c=>c.id===e.caseId),v=c?.variants.find(v=>v.id===e.variantId);return <div key={entryKey(e)} className="flex gap-2 justify-between text-xs bg-zinc-950 p-2 rounded"><div><p>{c?.name}</p><p className="text-zinc-500 text-[10px]">{v?.label}</p></div><button aria-label={`Remove ${c?.name} ${v?.label} from session`} onClick={()=>props.onToggleEntry(e)} className="text-zinc-400">×</button></div>;})}</div>
      <details className="text-xs text-zinc-400"><summary className="cursor-pointer">Solving frame · {FACE_LABELS[props.grip.up]} up / {FACE_LABELS[props.grip.front]} front</summary><div className="mt-3"><CubeCanvas moveHistory={[]} view="3d" grip={props.grip} onGripChange={props.onGripChange}/></div></details>
      <p className="text-[11px] text-zinc-500">Selections and preferred alternates stay in this browser. Practice records keep the variant, setup, actual moves, and pauses for future habit analysis.</p>
    </aside>
  </div>;
}
