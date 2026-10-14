import type { AlgCase, TrainingSession, TrainingEntry } from '../types';
const KEY='ganicv4_training_session_v1';
export const entryKey=(e:TrainingEntry)=>`${e.caseId}:${e.variantId}`;
export function loadTrainingSession(cases:AlgCase[]):TrainingSession {
  try {const s=JSON.parse(localStorage.getItem(KEY)??'null');
    if(s && typeof s.id==='string' && Array.isArray(s.entries))return {id:s.id,name:typeof s.name==='string'?s.name:'My training session',selection:s.selection==='weighted'?'weighted':'balanced',entries:s.entries.filter((e:TrainingEntry)=>cases.some(c=>c.id===e.caseId && c.variants.some(v=>v.id===e.variantId)))};
  }catch{/* defaults */}
  return {id:crypto.randomUUID(),name:'My training session',entries:[],selection:'balanced'};
}
export function saveTrainingSession(s:TrainingSession):void {try{localStorage.setItem(KEY,JSON.stringify(s));}catch{/* session remains available in memory */}}
export function resolveEntry(cases:AlgCase[],entry:TrainingEntry):AlgCase|null {
  const c=cases.find(c=>c.id===entry.caseId),v=c?.variants.find(v=>v.id===entry.variantId);
  return c && v?{...c,alg:v.alg,preferredVariantId:v.id,setup:undefined}:null;
}
export function toggleTrainingEntry(session:TrainingSession,entry:TrainingEntry):TrainingSession {
  const exists=session.entries.some(e=>entryKey(e)===entryKey(entry));
  return {...session,entries:exists?session.entries.filter(e=>entryKey(e)!==entryKey(entry)):[...session.entries,entry]};
}
