/**
 * useTrainerState.ts — central React state hook for the trainer loop.
 *
 * Integrates:
 * - ScrambleAssistant state machine with dynamic error recovery
 * - HyperSpeedCube / Standard Ergonomic keyboard simulation
 * - XP, leveling, streak tracking, and gamified achievement feedback
 * - Real-time cubing.js puzzle-state tracking and solved-state validation
 * - Synthesized sound effects (Web Audio API)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AlgCase, TrainerPhase, AttemptResult, TrainingEntry, TrainingSession } from '../types';
import { ScrambleAssistant, ScrambleAssistantSnapshot } from '../utils/ScrambleAssistant';
import { invertAlg } from '../utils/moveUtils';
import { loadCases, saveCases, appendAttempt, updateCaseStats } from '../utils/storage';
import { selectNextCase } from '../utils/weightedSelection';
import { KeybindPresetId, KEYBIND_PRESETS } from '../utils/keybinds';
import { playTurnClick, playErrorBuzz, playSuccessChime, isSoundEnabled, setSoundEnabled } from '../utils/soundEffects';
import { puzzles } from 'cubing/puzzles';
import type { KPattern, KPuzzle } from 'cubing/kpuzzle';
import { Alg } from 'cubing/alg';
import { DEFAULT_GRIP } from '../utils/gripOrientation';
import type { GripOrientation } from '../utils/gripOrientation';
import { loadTrainingSession, saveTrainingSession, toggleTrainingEntry, resolveEntry, entryKey } from '../utils/trainingSession';
import { useXpSystem, XpState, XpEvent } from './useXpSystem';

export interface TrainerState {
  trainingSession: TrainingSession;
  phase: TrainerPhase;
  activeCase: AlgCase | null;
  scrambleSnap: ScrambleAssistantSnapshot | null;
  lastAttempt: AttemptResult | null;
  cases: AlgCase[];
  simulatorMode: boolean;
  keybindPreset: KeybindPresetId;
  soundEnabled: boolean;
  xpState: XpState;
  lastXpEvent: XpEvent | null;
  streak: number;
  moveHistory: string[];
  puzzleReady: boolean;
  lastMove: string | null; // latest move executed
}

export interface TrainerActions {
  selectCase: (c: AlgCase) => void;
  nextCase: () => void;
  toggleSessionEntry: (entry:TrainingEntry)=>void;
  addSessionEntries: (entries:TrainingEntry[])=>void;
  setSessionSelection: (mode:TrainingSession['selection'])=>void;
  setSessionName: (name:string)=>void;
  preferVariant: (caseId:string,variantId:string)=>void;
  addCustomVariant: (caseId:string,label:string,alg:string)=>string|null;
  feedMove: (move: string, timestamp?: number) => void;
  setSimulatorMode: (enabled: boolean) => void;
  syncSolvedState: () => void;
  toggleSimulator: () => void;
  setKeybindPreset: (preset: KeybindPresetId) => void;
  toggleSound: () => void;
  updateCaseStatus: (id: string, status: AlgCase['status']) => void;
  dismissXpBanner: () => void;
}

export function useTrainerState(keyboardEnabled = true, grip:GripOrientation = DEFAULT_GRIP): [TrainerState, TrainerActions] {
  const [cases, setCases] = useState<AlgCase[]>(() => loadCases());
  const [trainingSession,setTrainingSession]=useState(()=>loadTrainingSession(cases));
  useEffect(()=>saveTrainingSession(trainingSession),[trainingSession]);
  const gripRef=useRef(grip);gripRef.current=grip;
  const attemptGripRef=useRef(grip);
  const setupAlgRef=useRef('');
  const executionEvents=useRef<{move:string;timestamp:number}[]>([]);
  const [phase, setPhaseState] = useState<TrainerPhase>('CASE_SELECTION');
  const phaseRef = useRef<TrainerPhase>('CASE_SELECTION');
  const setPhase = useCallback((next: TrainerPhase) => { phaseRef.current = next; setPhaseState(next); }, []);
  const [activeCase, setActiveCase] = useState<AlgCase | null>(null);
  const [scrambleSnap, setScrambleSnap] = useState<ScrambleAssistantSnapshot | null>(null);
  const [lastAttempt, setLastAttempt] = useState<AttemptResult | null>(null);
  const [simulatorMode, setSimulatorMode] = useState(true);
  const [keybindPreset, setKeybindPresetState] = useState<KeybindPresetId>('hyperspeedcube');
  const [soundActive, setSoundActive] = useState<boolean>(() => isSoundEnabled());
  const [lastXpEvent, setLastXpEvent] = useState<XpEvent | null>(null);
  const [lastMove, setLastMove] = useState<string | null>(null);

  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [puzzleReady, setPuzzleReady] = useState(false);
  const puzzleRef = useRef<KPuzzle | null>(null);
  const patternRef = useRef<KPattern | null>(null);
  const activeRef = useRef<AlgCase | null>(null);
  const executionMoves = useRef<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    puzzles['3x3x3'].kpuzzle().then(puzzle => {
      if (cancelled) return;
      puzzleRef.current = puzzle;
      patternRef.current = puzzle.defaultPattern();
      setPuzzleReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  const { xpState, recordAttempt } = useXpSystem();

  const assistantRef = useRef<ScrambleAssistant | null>(null);
  const recStartRef = useRef<number | null>(null);
  const execStartRef = useRef<number | null>(null);
  const moveTimestamps = useRef<number[]>([]);
  const hadMistakeRef = useRef(false);

  // Persist case changes
  useEffect(() => {
    saveCases(cases);
  }, [cases]);

  const toggleSound = useCallback(() => {
    setSoundActive(prev => {
      const next = !prev;
      setSoundEnabled(next);
      return next;
    });
  }, []);

  const setKeybindPreset = useCallback((p: KeybindPresetId) => {
    setKeybindPresetState(p);
  }, []);

  const dismissXpBanner = useCallback(() => {
    setLastXpEvent(null);
  }, []);

  const finishExecution = useCallback((execEnd: number) => {
    const activeCase = activeRef.current;
    if (!activeCase || execStartRef.current === null || recStartRef.current === null) return;
    const recMs = Math.max(1, execStartRef.current - recStartRef.current);
    const execMs = Math.max(1, execEnd - execStartRef.current);
    const moves = executionMoves.current.filter(m => !/^[xyz]/.test(m)).length;
    const tps = moves / (execMs / 1000);
    const ts = moveTimestamps.current;
    const deltas = ts.slice(1).map((t, i) => t - ts[i]);

    const result: AttemptResult = {
      caseId: activeCase.id,
      variantId: activeCase.preferredVariantId,
      algorithm: activeCase.alg,
      setupAlg: setupAlgRef.current,
      sessionId: trainingSession.entries.some(e=>e.caseId===activeCase.id && e.variantId===activeCase.preferredVariantId)?trainingSession.id:undefined,
      startingGrip: {...attemptGripRef.current},
      moveEvents: executionEvents.current.map(e=>({...e,elapsedMs:Math.max(0,e.timestamp-execStartRef.current!)})),
      recognitionMs: recMs,
      executionMs: execMs,
      tps,
      moveDeltas: deltas,
      timestamp: execEnd,
      moves: [...executionMoves.current],
      hadMistake: hadMistakeRef.current,
    };

    appendAttempt(result);
    setCases(prev => updateCaseStats(prev, result, hadMistakeRef.current));
    setLastAttempt(result);

    // Gamification: compute and award XP
    const event = recordAttempt(result, hadMistakeRef.current);
    setLastXpEvent(event);

    playSuccessChime();
    setPhase('REVIEW');
  }, [recordAttempt, setPhase, trainingSession]);

  const feedMove = useCallback((move: string, timestamp = Date.now()) => {
    const currentPhase = phaseRef.current;
    if (!activeRef.current || !patternRef.current ||
        !['SCRAMBLING', 'ERROR_RECOVERY', 'RECOGNIZING', 'EXECUTING'].includes(currentPhase)) return;
    patternRef.current = patternRef.current.applyMove(move);
    setMoveHistory(prev => [...prev, move]);
    playTurnClick();
    setLastMove(move);

    if (currentPhase === 'SCRAMBLING' || currentPhase === 'ERROR_RECOVERY') {
      assistantRef.current?.feedMove(move);
      const snap = assistantRef.current?.snapshot();
      if (!snap) return;
      setScrambleSnap(snap);
      if (snap.assistantState === 'done') {
        setPhase('RECOGNIZING');
        recStartRef.current = timestamp;
      } else if (snap.assistantState === 'error_recovery') {
        setPhase('ERROR_RECOVERY');
        hadMistakeRef.current = true;
        playErrorBuzz();
      } else setPhase('SCRAMBLING');
      return;
    }

    // Rotations change the frame, but do not start the physical execution timer.
    if (currentPhase === 'RECOGNIZING' && /^[xyz]/.test(move)) { executionMoves.current.push(move);executionEvents.current.push({move,timestamp});return; }
    if (currentPhase === 'RECOGNIZING') {
      execStartRef.current = timestamp;
      moveTimestamps.current = [];
      setPhase('EXECUTING');
    }
    executionMoves.current.push(move);
    executionEvents.current.push({move,timestamp});
    if (!/^[xyz]/.test(move)) moveTimestamps.current.push(timestamp);
    if (patternRef.current.experimentalIsSolved({
      ignorePuzzleOrientation: true, ignoreCenterOrientation: true,
    })) finishExecution(timestamp);
  }, [finishExecution, setPhase]);

  // Keyboard simulator event listener with current preset keymap
  useEffect(() => {
    if (!simulatorMode || !keyboardEnabled) return;
    const preset = KEYBIND_PRESETS[keybindPreset];
    const keyMap = preset.keyMap;

    const handler = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey ||
          (e.target instanceof HTMLElement && e.target.closest('input, textarea, select, button, [contenteditable], [role=dialog]'))) return;

      // Escape resets to case selection
      if (e.key === 'Escape') {
        setPhase('CASE_SELECTION');
        return;
      }

      // Check direct key match (case sensitive for shift, e.g. 'U') then lower-case
      const move = keyMap[e.key] || keyMap[e.key.toLowerCase()];
      if (move) {
        e.preventDefault();
        feedMove(move);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [simulatorMode, keyboardEnabled, keybindPreset, feedMove, setPhase]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const selectCase = useCallback((c: AlgCase) => {
    if (!puzzleRef.current) return;
    activeRef.current = c;
    attemptGripRef.current={...gripRef.current};
    executionEvents.current=[];
    patternRef.current = puzzleRef.current.defaultPattern();
    setMoveHistory([]);
    recStartRef.current = null;
    execStartRef.current = null;
    executionMoves.current = [];
    moveTimestamps.current = [];
    hadMistakeRef.current = false;
    setLastXpEvent(null);
    setActiveCase(c);
    setLastMove(null);

    const scramble = c.setup || invertAlg(c.alg);
    setupAlgRef.current=scramble;
    const assistant = new ScrambleAssistant(scramble, setScrambleSnap);
    assistantRef.current = assistant;
    setScrambleSnap(assistant.snapshot());
    setPhase('SCRAMBLING');
  }, [setPhase]);

  const balancedBag=useRef<string[]>([]);
  useEffect(()=>{balancedBag.current=[];},[trainingSession.entries,trainingSession.selection]);
  const nextCase = useCallback(() => {
    const pool=trainingSession.entries.map(e=>resolveEntry(cases,e)).filter((c):c is AlgCase=>Boolean(c));
    if(!pool.length)return;
    let next:AlgCase|null=null;
    if(trainingSession.selection==='weighted') {
      const weighted=pool.map(c=>({...c,...c.variantStats?.[c.preferredVariantId]}));
      next=selectNextCase(weighted,{statusFilter:['unlearned','learning','learned']});
    } else {
      if(!balancedBag.current.length){
        balancedBag.current=trainingSession.entries.map(entryKey);
        for(let i=balancedBag.current.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[balancedBag.current[i],balancedBag.current[j]]=[balancedBag.current[j],balancedBag.current[i]];}
      }
      const key=balancedBag.current.pop();
      next=pool.find(c=>`${c.id}:${c.preferredVariantId}`===key)??pool[0];
    }
    if(next)selectCase(next);
  },[cases,trainingSession,selectCase]);
  const toggleSessionEntry=useCallback((entry:TrainingEntry)=>setTrainingSession(s=>toggleTrainingEntry(s,entry)),[]);
  const addSessionEntries=useCallback((entries:TrainingEntry[])=>setTrainingSession(s=>({...s,entries:[...s.entries,...entries.filter(e=>!s.entries.some(prior=>entryKey(prior)===entryKey(e)))]})),[]);
  const setSessionSelection=useCallback((selection:TrainingSession['selection'])=>setTrainingSession(s=>({...s,selection})),[]);
  const setSessionName=useCallback((name:string)=>setTrainingSession(s=>({...s,name:name.slice(0,80)})),[]);
  const preferVariant=useCallback((id:string,variantId:string)=>{
    setCases(prev=>prev.map(c=>{const v=c.variants.find(v=>v.id===variantId);return c.id===id && v?{...c,alg:v.alg,preferredVariantId:variantId,setup:undefined}:c;}));
  },[]);
  const addCustomVariant=useCallback((id:string,label:string,input:string):string|null=>{
    try{
      const expanded=new Alg(input).expand().toString().replace(/([RLUDFB])w/g,(_,f:string)=>f.toLowerCase()).replace(/2'/g,'2');
      if(!expanded.trim() || expanded.split(/\s+/).length>200 || expanded.split(/\s+/).some(m=>!/^[RLUDFBrludfbMESxyz][2']?$/.test(m)))throw new Error('Enter 1–200 moves.');
      puzzleRef.current?.algToTransformation(expanded);
      const variant={id:`custom-${crypto.randomUUID()}`,label:label.trim().slice(0,80)||'My alternate',alg:expanded,tags:['Personal alternate']};
      setCases(prev=>prev.map(c=>c.id===id?{...c,variants:[...c.variants,variant]}:c));return null;
    }catch(e){return e instanceof Error?e.message:'Invalid algorithm';}
  },[]);

  const syncSolvedState = useCallback(() => {
    setPhase('CASE_SELECTION');
    activeRef.current = null;
    assistantRef.current = null;
    patternRef.current = puzzleRef.current?.defaultPattern() ?? null;
    setMoveHistory([]);
    setActiveCase(null);
    setScrambleSnap(null);
    setLastXpEvent(null);
    setLastMove(null);
  }, [setPhase]);

  const toggleSimulator = useCallback(() => {
    setSimulatorMode(v => !v);
  }, []);

  const updateCaseStatus = useCallback((id: string, status: AlgCase['status']) => {
    setCases(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    setActiveCase(prev => prev?.id === id ? { ...prev, status } : prev);
  }, []);

  const latestCase=cases.find(c=>c.id===activeCase?.id);
  const activeVariant=latestCase?.variants.find(v=>v.id===activeCase?.preferredVariantId);
  const displayedCase=latestCase && activeVariant?{...latestCase,alg:activeVariant.alg,preferredVariantId:activeVariant.id}:activeCase;
  const state: TrainerState = {
    trainingSession,
    phase,
    activeCase: displayedCase,
    scrambleSnap,
    lastAttempt,
    cases,
    simulatorMode,
    keybindPreset,
    soundEnabled: soundActive,
    xpState,
    lastXpEvent,
    streak: xpState.streak,
    lastMove,
    moveHistory,
    puzzleReady,
  };

  const actions: TrainerActions = {
    selectCase,
    nextCase,
    toggleSessionEntry,
    addSessionEntries,
    setSessionSelection,
    setSessionName,
    preferVariant,
    addCustomVariant,
    feedMove,
    setSimulatorMode,
    syncSolvedState,
    toggleSimulator,
    setKeybindPreset,
    toggleSound,
    updateCaseStatus,
    dismissXpBanner,
  };

  return [state, actions];
}
