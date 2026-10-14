/**
 * useTrainerState.ts — central React state hook for the trainer loop.
 *
 * Manages the AppState machine, timing, and glues together the
 * ScrambleAssistant, keyboard simulator, and (later) the BLE manager.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AlgCase, TrainerPhase, AttemptResult } from '../types';
import { ScrambleAssistant, ScrambleAssistantSnapshot } from '../utils/ScrambleAssistant';
import { invertAlg, etmCount } from '../utils/moveUtils';
import { loadCases, saveCases, appendAttempt, updateCaseStats } from '../utils/storage';
import { selectNextCase } from '../utils/weightedSelection';

// ─── Keyboard → Move map (simulator mode) ────────────────────────────────────
// Keys chosen to avoid browser conflicts; user-facing labels are in the UI.
const KEY_MOVE_MAP: Record<string, string> = {
  'u': 'U', 'i': "U'",
  'h': 'R', 'j': "R'",
  'f': 'F', 'd': "F'",
  'k': 'L', 'l': "L'",
  'r': 'B', 'e': "B'",
  'n': 'D', 'm': "D'",
};

export interface TrainerState {
  phase: TrainerPhase;
  activeCase: AlgCase | null;
  scrambleSnap: ScrambleAssistantSnapshot | null;
  lastAttempt: AttemptResult | null;
  cases: AlgCase[];
  simulatorMode: boolean;
}

export interface TrainerActions {
  selectCase: (c: AlgCase) => void;
  nextCase: () => void;
  feedMove: (move: string) => void;
  syncSolvedState: () => void;
  toggleSimulator: () => void;
  updateCaseStatus: (id: string, status: AlgCase['status']) => void;
}

export function useTrainerState(): [TrainerState, TrainerActions] {
  const [cases, setCases] = useState<AlgCase[]>(() => loadCases());
  const [phase, setPhase] = useState<TrainerPhase>('CASE_SELECTION');
  const [activeCase, setActiveCase] = useState<AlgCase | null>(null);
  const [scrambleSnap, setScrambleSnap] = useState<ScrambleAssistantSnapshot | null>(null);
  const [lastAttempt, setLastAttempt] = useState<AttemptResult | null>(null);
  const [simulatorMode, setSimulatorMode] = useState(true);

  const assistantRef = useRef<ScrambleAssistant | null>(null);
  const recStartRef = useRef<number | null>(null);
  const execStartRef = useRef<number | null>(null);
  const moveTimestamps = useRef<number[]>([]);
  const hadMistakeRef = useRef(false);

  // ── Persist case changes ───────────────────────────────────────────────────
  useEffect(() => { saveCases(cases); }, [cases]);

  // ── Keyboard simulator ─────────────────────────────────────────────────────
  const feedMove = useCallback((move: string) => {
    if (!activeCase) return;

    if (phase === 'SCRAMBLING' || phase === 'ERROR_RECOVERY') {
      assistantRef.current?.feedMove(move);
      const snap = assistantRef.current?.snapshot();
      if (snap) {
        setScrambleSnap(snap);
        if (snap.assistantState === 'done') {
          setPhase('RECOGNIZING');
          recStartRef.current = Date.now();
        } else if (snap.assistantState === 'error_recovery') {
          setPhase('ERROR_RECOVERY');
          hadMistakeRef.current = true;
        } else {
          setPhase('SCRAMBLING');
        }
      }
      return;
    }

    if (phase === 'RECOGNIZING') {
      // First physical move starts execution
      execStartRef.current = Date.now();
      moveTimestamps.current = [execStartRef.current];
      setPhase('EXECUTING');
      // fall through — count this move
    }

    if (phase === 'EXECUTING') {
      const now = Date.now();
      moveTimestamps.current.push(now);

      // Simple heuristic: execution ends when expected ETM move count reached
      const expected = etmCount(activeCase.alg);
      if (moveTimestamps.current.length >= expected + 1) {
        finishExecution();
      }
    }
  }, [phase, activeCase]);

  const finishExecution = useCallback(() => {
    if (!activeCase || !execStartRef.current || !recStartRef.current) return;
    const execEnd = Date.now();
    const recMs = execStartRef.current - recStartRef.current;
    const execMs = execEnd - execStartRef.current;
    const tps = etmCount(activeCase.alg) / (execMs / 1000);
    const ts = moveTimestamps.current;
    const deltas = ts.slice(1).map((t, i) => t - ts[i]);

    const result: AttemptResult = {
      caseId: activeCase.id,
      recognitionMs: recMs,
      executionMs: execMs,
      tps,
      moveDeltas: deltas,
      timestamp: execEnd,
    };

    appendAttempt(result);
    setCases(prev => updateCaseStats(prev, result, hadMistakeRef.current));
    setLastAttempt(result);
    setPhase('REVIEW');
  }, [activeCase]);

  useEffect(() => {
    if (!simulatorMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const move = KEY_MOVE_MAP[e.key.toLowerCase()];
      if (move) feedMove(move);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [simulatorMode, feedMove]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const selectCase = useCallback((c: AlgCase) => {
    hadMistakeRef.current = false;
    setActiveCase(c);
    const scramble = invertAlg(c.alg);
    const assistant = new ScrambleAssistant(scramble, setScrambleSnap);
    assistantRef.current = assistant;
    setScrambleSnap(assistant.snapshot());
    setPhase('SCRAMBLING');
  }, []);

  const nextCase = useCallback(() => {
    const next = selectNextCase(cases, {
      statusFilter: ['unlearned', 'learning', 'learned'],
    });
    if (next) selectCase(next);
  }, [cases, selectCase]);

  const syncSolvedState = useCallback(() => {
    // Will hook into BLE in Milestone 3; for now just resets phase
    setPhase('CASE_SELECTION');
    setActiveCase(null);
    setScrambleSnap(null);
  }, []);

  const toggleSimulator = useCallback(() => {
    setSimulatorMode(v => !v);
  }, []);

  const updateCaseStatus = useCallback((id: string, status: AlgCase['status']) => {
    setCases(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  }, []);

  const state: TrainerState = {
    phase,
    activeCase,
    scrambleSnap,
    lastAttempt,
    cases,
    simulatorMode,
  };

  const actions: TrainerActions = {
    selectCase,
    nextCase,
    feedMove,
    syncSolvedState,
    toggleSimulator,
    updateCaseStatus,
  };

  return [state, actions];
}
