import type { ScrambleProvenance } from './officialScramble';
import type { KPuzzle, KPattern } from 'cubing/kpuzzle';
import { ScrambleAssistant } from './ScrambleAssistant';
import type { GripOrientation } from './gripOrientation';
export type SolvePhase = 'scrambling' | 'ready' | 'solving' | 'review';
export interface SolveMove { move: string; rawMove?: string; timestamp: number; elapsedMs: number }
export interface SolveRecord {
  groupId?:string; groupName?:string;
  scrambleProvenance?:ScrambleProvenance;
  schemaVersion: 1; id: string; puzzle: '3x3x3'; createdAt: number;
  source: 'simulator' | 'gan' | 'manual'; scramble: string;
  startingGrip: GripOrientation; setupMoves: SolveMove[]; solution: SolveMove[];
  durationMs: number; inspectionMs: number; solved: boolean;
  termination: 'solved' | 'manual' | 'dnf';
  setupMethod: 'guided' | 'virtual-applied' | 'manual-confirmed';
}
export function validateScramble(value: string): string {
  const tokens=value.trim().split(/\s+/);
  if (!value.trim() || tokens.length > 200 || tokens.some(m=>!/^[URFDLB][2']?$/.test(m))) throw new Error("Enter 1–200 outer-face scramble moves, such as R U2 F'.");
  return tokens.join(' ');
}
export class SolveSession {
  phase: SolvePhase='scrambling'; assistant: ScrambleAssistant; pattern: KPattern;
  setupMoves: SolveMove[]=[]; solution: SolveMove[]=[]; readyAt=0; startedAt: number | null=null; result: SolveRecord | null=null;
  setupMethod: SolveRecord['setupMethod']='guided';
  readonly createdAt=Date.now();
  constructor(readonly puzzle: KPuzzle, readonly scramble: string, readonly grip: GripOrientation, readonly source: SolveRecord['source'],readonly provenance:ScrambleProvenance={kind:'custom'},readonly group:{id:string;name:string}={id:'regular-3x3',name:'Regular 3×3'}) {
    this.scramble=validateScramble(scramble);this.pattern=puzzle.defaultPattern();this.assistant=new ScrambleAssistant(this.scramble,()=>{});
  }
  useManualSetup(now=Date.now()): void { this.setupMethod=this.source==='manual'?'manual-confirmed':'virtual-applied';this.pattern=this.puzzle.defaultPattern().applyAlg(this.scramble);this.phase='ready';this.readyAt=now; }
  start(now=Date.now()): void { if(this.phase!=='ready')return;this.startedAt=now;this.phase='solving'; }
  feed(move: string, timestamp=Date.now(), rawMove?: string): SolveRecord | null {
    if(this.phase==='review')return null;
    this.pattern=this.pattern.applyMove(move);
    if(this.phase==='scrambling') {
      this.setupMoves.push({move,rawMove,timestamp,elapsedMs:timestamp-this.createdAt});this.assistant.feedMove(move);
      if(this.assistant.isDone){this.phase='ready';this.readyAt=timestamp;}return null;
    }
    // A pre-solve regrip is retained in the reconstruction but starts no timer.
    if(this.phase==='ready' && !/^[xyz]/.test(move))this.start(timestamp);
    this.solution.push({move,rawMove,timestamp,elapsedMs:this.startedAt===null?0:Math.max(0,timestamp-this.startedAt)});
    if(this.phase==='solving' && this.pattern.experimentalIsSolved({ignorePuzzleOrientation:true,ignoreCenterOrientation:true}))return this.finish(timestamp,'solved');
    return null;
  }
  finish(now=Date.now(), termination: SolveRecord['termination']='manual'): SolveRecord | null {
    if(this.phase!=='solving' || this.startedAt===null || this.result)return null;
    this.phase='review';
    this.result={schemaVersion:1,id:crypto.randomUUID(),puzzle:'3x3x3',groupId:this.group.id,groupName:this.group.name,createdAt:this.createdAt,source:this.source,scramble:this.scramble,scrambleProvenance:this.provenance,setupMethod:this.setupMethod,startingGrip:{...this.grip},setupMoves:[...this.setupMoves],solution:[...this.solution],durationMs:Math.max(0,now-this.startedAt),inspectionMs:Math.max(0,this.startedAt-this.readyAt),solved:termination==='solved',termination};
    return this.result;
  }
}
const KEY='ganicv4_solves_v1';
export function loadSolves(): SolveRecord[] {try{const records=JSON.parse(localStorage.getItem(KEY)??'[]');return Array.isArray(records)?records.filter(r=>r.schemaVersion===1 && typeof r.scramble==='string' && Array.isArray(r.solution) && Number.isFinite(r.durationMs)):[];}catch{return [];} }
export function saveSolves(records: SolveRecord[]): void {localStorage.setItem(KEY,JSON.stringify(records.slice(-1000)));}

export function rollingAverage(records: SolveRecord[], size: number): number | 'DNF' | null {
  if(records.length<size)return null;
  const times=records.slice(-size).map(r=>r.termination==='dnf'?Infinity:r.durationMs).sort((a,b)=>a-b);
  const trim=Math.ceil(size*0.05),middle=times.slice(trim,size-trim);
  return middle.some(t=>!Number.isFinite(t))?'DNF':middle.reduce((sum,t)=>sum+t,0)/middle.length;
}
export function solveSummary(records:SolveRecord[]) {
  const successful=records.filter(r=>r.termination!=='dnf').map(r=>r.durationMs);
  return {bestMs:successful.length?Math.min(...successful):null,meanMs:successful.length?successful.reduce((a,b)=>a+b,0)/successful.length:null,ao5:rollingAverage(records,5),ao12:rollingAverage(records,12)};
}
