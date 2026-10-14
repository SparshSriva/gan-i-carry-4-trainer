/**
 * useTrainerState.ts — central React state hook for the trainer loop.
 *
 * Integrates:
 * - ScrambleAssistant state machine with dynamic error recovery
 * - HyperSpeedCube / Standard Ergonomic keyboard simulation
 * - XP, leveling, streak tracking, and gamified achievement feedback
 * - Real-time 54-facelet mathematical permutation tracking for NavaCakraYantra
 * - Synthesized sound effects (Web Audio API)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AlgCase, TrainerPhase, AttemptResult } from '../types';
import { ScrambleAssistant, ScrambleAssistantSnapshot } from '../utils/ScrambleAssistant';
import { invertAlg, etmCount } from '../utils/moveUtils';
import { loadCases, saveCases, appendAttempt, updateCaseStats } from '../utils/storage';
import { selectNextCase } from '../utils/weightedSelection';
import { KeybindPresetId, KEYBIND_PRESETS } from '../utils/keybinds';
import { playTurnClick, playErrorBuzz, playSuccessChime, isSoundEnabled, setSoundEnabled } from '../utils/soundEffects';
import { useXpSystem, XpState, XpEvent } from './useXpSystem';
import { applyFaceletMove, applyFaceletAlg } from '../utils/faceletSimulator';
import { SOLVED_FACELETS } from '../data/navaCakraGeometry';

export interface TrainerState {
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
  facelets: string;        // 54-char mathematical facelet string
  lastMove: string | null; // latest move executed
}

export interface TrainerActions {
  selectCase: (c: AlgCase) => void;
  nextCase: () => void;
  feedMove: (move: string) => void;
  syncSolvedState: () => void;
  toggleSimulator: () => void;
  setKeybindPreset: (preset: KeybindPresetId) => void;
  toggleSound: () => void;
  updateCaseStatus: (id: string, status: AlgCase['status']) => void;
  dismissXpBanner: () => void;
}

export function useTrainerState(): [TrainerState, TrainerActions] {
  const [cases, setCases] = useState<AlgCase[]>(() => loadCases());
  const [phase, setPhase] = useState<TrainerPhase>('CASE_SELECTION');
  const [activeCase, setActiveCase] = useState<AlgCase | null>(null);
  const [scrambleSnap, setScrambleSnap] = useState<ScrambleAssistantSnapshot | null>(null);
  const [lastAttempt, setLastAttempt] = useState<AttemptResult | null>(null);
  const [simulatorMode, setSimulatorMode] = useState(true);
  const [keybindPreset, setKeybindPresetState] = useState<KeybindPresetId>('hyperspeedcube');
  const [soundActive, setSoundActive] = useState<boolean>(() => isSoundEnabled());
  const [lastXpEvent, setLastXpEvent] = useState<XpEvent | null>(null);
  const [facelets, setFacelets] = useState<string>(SOLVED_FACELETS);
  const [lastMove, setLastMove] = useState<string | null>(null);

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

  const finishExecution = useCallback(() => {
    if (!activeCase || !execStartRef.current || !recStartRef.current) return;
    const execEnd = Date.now();
    const recMs = Math.max(1, execStartRef.current - recStartRef.current);
    const execMs = Math.max(1, execEnd - execStartRef.current);
    const moves = etmCount(activeCase.alg);
    const tps = moves / (execMs / 1000);
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

    // Gamification: compute and award XP
    const event = recordAttempt(result, hadMistakeRef.current);
    setLastXpEvent(event);

    playSuccessChime();
    setPhase('REVIEW');
  }, [activeCase, recordAttempt]);

  const feedMove = useCallback((move: string) => {
    if (!activeCase) return;

    playTurnClick();
    setLastMove(move);
    setFacelets(prev => applyFaceletMove(prev, move));

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
          playErrorBuzz();
        } else {
          setPhase('SCRAMBLING');
        }
      }
      return;
    }

    if (phase === 'RECOGNIZING') {
      execStartRef.current = Date.now();
      moveTimestamps.current = [execStartRef.current];
      setPhase('EXECUTING');
      // count move as part of execution
    }

    if (phase === 'EXECUTING') {
      const now = Date.now();
      moveTimestamps.current.push(now);

      const expected = etmCount(activeCase.alg);
      if (moveTimestamps.current.length >= expected + 1) {
        finishExecution();
      }
    }
  }, [phase, activeCase, finishExecution]);

  // Keyboard simulator event listener with current preset keymap
  useEffect(() => {
    if (!simulatorMode) return;
    const preset = KEYBIND_PRESETS[keybindPreset];
    const keyMap = preset.keyMap;

    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

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
  }, [simulatorMode, keybindPreset, feedMove]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const selectCase = useCallback((c: AlgCase) => {
    hadMistakeRef.current = false;
    setLastXpEvent(null);
    setActiveCase(c);
    setLastMove(null);

    // Compute initial scrambled facelets for the 2D permutation graph
    const scramble = invertAlg(c.alg);
    const initialScrambledFacelets = applyFaceletAlg(SOLVED_FACELETS, scramble);
    setFacelets(initialScrambledFacelets);

    const assistant = new ScrambleAssistant(scramble, setScrambleSnap);
    assistantRef.current = assistant;
    setScrambleSnap(assistant.snapshot());
    setPhase('SCRAMBLING');
  }, []);

  const nextCase = useCallback(() => {
    setLastXpEvent(null);
    const next = selectNextCase(cases, {
      statusFilter: ['unlearned', 'learning', 'learned'],
    });
    if (next) selectCase(next);
  }, [cases, selectCase]);

  const syncSolvedState = useCallback(() => {
    setPhase('CASE_SELECTION');
    setActiveCase(null);
    setScrambleSnap(null);
    setLastXpEvent(null);
    setFacelets(SOLVED_FACELETS);
    setLastMove(null);
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
    keybindPreset,
    soundEnabled: soundActive,
    xpState,
    lastXpEvent,
    streak: xpState.streak,
    facelets,
    lastMove,
  };

  const actions: TrainerActions = {
    selectCase,
    nextCase,
    feedMove,
    syncSolvedState,
    toggleSimulator,
    setKeybindPreset,
    toggleSound,
    updateCaseStatus,
    dismissXpBanner,
  };

  return [state, actions];
}
