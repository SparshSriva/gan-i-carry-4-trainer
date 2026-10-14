import type { ScrambleProvenance } from '../utils/officialScramble';
import { useState, useEffect, useRef, useCallback } from 'react';
import { puzzles } from 'cubing/puzzles';
import type { KPuzzle } from 'cubing/kpuzzle';
import { SolveSession, loadSolves, saveSolves } from '../utils/solveSession';
import type { SolveRecord } from '../utils/solveSession';
import type { GripOrientation } from '../utils/gripOrientation';
import { KEYBIND_PRESETS } from '../utils/keybinds';
import type { KeybindPresetId } from '../utils/keybinds';
import { parseAlg } from '../utils/moveUtils';
import { loadSolveGroups, saveSolveGroups, groupSolves } from '../utils/solveGroups';

export function useSolveTimer(enabled: boolean, simulator: boolean, preset: KeybindPresetId, grip: GripOrientation) {
  const [history,setHistory]=useState(loadSolves),[session,setSession]=useState<SolveSession|null>(null);
  const [groupState,setGroupState]=useState(loadSolveGroups);
  const groupRef=useRef(groupState);groupRef.current=groupState;
  const [moveHistory,setMoves]=useState<string[]>([]),[revision,setRevision]=useState(0),[now,setNow]=useState(Date.now()),[error,setError]=useState('');
  const ref=useRef<SolveSession|null>(null),puzzle=useRef<KPuzzle|null>(null),gripRef=useRef(grip);
  gripRef.current=grip;
  const [ready,setReady]=useState(false);
  useEffect(()=>{let cancelled=false;puzzles['3x3x3'].kpuzzle().then(p=>{if(!cancelled){puzzle.current=p;setReady(true);}});return()=>{cancelled=true;};},[]);
  const record=useCallback((result:SolveRecord|null)=>{
    if(!result)return;
    setHistory(previous=>{const next=[...previous,result].slice(-1000);return next;});
  },[]);
  useEffect(()=>{try{saveSolves(history);}catch{setError('History could not be saved to this browser. Export JSON to keep your solves.');}},[history]);
  useEffect(()=>{try{saveSolveGroups(groupState.groups,groupState.activeId);}catch{setError('Solve groups could not be saved. Export JSON to keep your data.');}},[groupState]);
  const begin=useCallback((scramble:string, manual=false,provenance:ScrambleProvenance={kind:'custom'})=>{
    if(!puzzle.current)return;
    if(ref.current && ref.current.phase!=='review'){setError('Cancel or finish the current attempt before starting another scramble.');return;}
    try{
      const g=groupRef.current.groups.find(g=>g.id===groupRef.current.activeId)!;
      const next=new SolveSession(puzzle.current,scramble,{...gripRef.current},manual?'manual':simulator?'simulator':'gan',provenance,{...g});
      ref.current=next;setSession(next);setMoves([]);setError('');setNow(Date.now());setRevision(n=>n+1);
    }catch(e){setError(e instanceof Error?e.message:'Invalid scramble');}
  },[simulator]);
  const feed=useCallback((move:string,timestamp=Date.now(),rawMove?:string)=>{
    const s=ref.current;if(!s || s.source==='manual' || s.phase==='review')return;
    record(s.feed(move,timestamp,rawMove));setMoves(prev=>[...prev,move]);setNow(timestamp);setRevision(n=>n+1);
  },[record]);
  const confirmSetup=useCallback(()=>{const s=ref.current;if(!s || s.phase!=='scrambling')return;s.useManualSetup();setMoves(parseAlg(s.scramble));setRevision(n=>n+1);},[]);
  const toggleManual=useCallback(()=>{const s=ref.current;if(!s || s.source!=='manual')return;if(s.phase==='ready')s.start();else if(s.phase==='solving')record(s.finish());setNow(Date.now());setRevision(n=>n+1);},[record]);
  const interrupt=useCallback(()=>{const s=ref.current;if(s?.phase==='solving')record(s.finish(Date.now(),'dnf'));ref.current=null;setSession(null);setMoves([]);setRevision(n=>n+1);},[record]);
  const selectGroup=useCallback((id:string)=>{
    if(ref.current && ref.current.phase!=='review')return;
    if(!groupRef.current.groups.some(g=>g.id===id))return;
    interrupt();setGroupState(prev=>({...prev,activeId:id}));
  },[interrupt]);
  const addGroup=useCallback((name:string)=>{
    if(ref.current && ref.current.phase!=='review')return false;
    const value=name.trim();if(!value || value.length>60){setError('Enter a group name of 1–60 characters.');return false;}
    if(groupRef.current.groups.some(g=>g.name.toLowerCase()===value.toLowerCase())){setError('A group with that name already exists.');return false;}
    const id=crypto.randomUUID();interrupt();setGroupState(prev=>({groups:[...prev.groups,{id,name:value}],activeId:id}));setError('');return true;
  },[interrupt]);
  const renameGroup=useCallback((name:string)=>{
    if(ref.current && ref.current.phase!=='review')return false;
    const value=name.trim();if(!value || value.length>60){setError('Enter a group name of 1–60 characters.');return false;}
    if(groupRef.current.groups.some(g=>g.id!==groupRef.current.activeId && g.name.toLowerCase()===value.toLowerCase())){setError('A group with that name already exists.');return false;}
    setGroupState(prev=>({...prev,groups:prev.groups.map(g=>g.id===prev.activeId?{...g,name:value}:g)}));setError('');return true;
  },[]);
  useEffect(()=>{if(session?.phase!=='solving')return;const id=window.setInterval(()=>setNow(Date.now()),30);return()=>window.clearInterval(id);},[session,revision]);
  useEffect(()=>{
    if(!enabled)return;
    const handle=(e:KeyboardEvent)=>{
      if(e.repeat || e.ctrlKey || e.metaKey || e.altKey || (e.target instanceof HTMLElement && e.target.closest('input, textarea, select, button, [contenteditable], [role=dialog]')))return;
      if(e.code==='Space' && ref.current?.source==='manual'){e.preventDefault();toggleManual();return;}
      if(!simulator || ref.current?.source!=='simulator')return;
      const map=KEYBIND_PRESETS[preset].keyMap,move=map[e.key]||map[e.key.toLowerCase()];if(move){e.preventDefault();feed(move);}
    };
    window.addEventListener('keydown',handle);return()=>window.removeEventListener('keydown',handle);
  },[enabled,simulator,preset,feed,toggleManual]);
  const elapsed=session?.result?.durationMs ?? (session?.startedAt===null || !session ? 0:Math.max(0,now-session.startedAt));
  return {session,moveHistory,history,groups:groupState.groups,activeGroup:groupState.groups.find(g=>g.id===groupState.activeId)!,groupHistory:groupSolves(history,groupState.activeId),selectGroup,addGroup,renameGroup,error,ready,elapsed,begin,feed,confirmSetup,toggleManual,interrupt};
}
export type SolveTimerState = ReturnType<typeof useSolveTimer>;
