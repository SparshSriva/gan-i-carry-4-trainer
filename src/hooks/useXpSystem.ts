/**
 * useXpSystem.ts — gamified XP / streak / level system.
 *
 * Rules:
 *  - Base XP per attempt: 10
 *  - Speed bonus: +5 if TPS > 5, +10 if TPS > 10
 *  - Recognition bonus: +3 if rec < 2s, +7 if rec < 1s
 *  - No-mistake bonus: +5
 *  - Streak multiplier: each consecutive mistake-free attempt adds 0.1× (caps at 2.0×)
 *  - Level thresholds: 0, 100, 250, 500, 900, 1500, 2500, 4000, 6000, 9000
 *
 * Stored in localStorage independently of case stats.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AttemptResult } from '../types';

const STORAGE_KEY = 'ganicv4_xp_v1';

export interface XpState {
  totalXp: number;
  level: number;
  xpToNext: number;
  streak: number;        // consecutive mistake-free solves
  longestStreak: number;
}

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1500, 2500, 4000, 6000, 9000, Infinity];
const LEVEL_NAMES = [
  'Beginner', 'Novice', 'Practitioner', 'Speedcuber',
  'Sub-15', 'Sub-10', 'Expert', 'Master', 'Elite', 'Legend',
];

function computeLevel(xp: number): { level: number; xpToNext: number } {
  for (let i = 0; i < LEVEL_THRESHOLDS.length - 1; i++) {
    if (xp < LEVEL_THRESHOLDS[i + 1]) {
      return { level: i, xpToNext: LEVEL_THRESHOLDS[i + 1] - xp };
    }
  }
  return { level: LEVEL_THRESHOLDS.length - 2, xpToNext: 0 };
}

function loadXpState(): XpState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { totalXp: 0, level: 0, xpToNext: 100, streak: 0, longestStreak: 0 };
  } catch {
    return { totalXp: 0, level: 0, xpToNext: 100, streak: 0, longestStreak: 0 };
  }
}

export function levelName(level: number): string {
  return LEVEL_NAMES[Math.min(level, LEVEL_NAMES.length - 1)];
}

export function xpForLevel(level: number): number {
  return LEVEL_THRESHOLDS[Math.min(level, LEVEL_THRESHOLDS.length - 1)];
}

export interface XpEvent {
  gained: number;
  newLevel?: number; // defined only on level-up
  breakdown: string[];
}

export function awardXp(prev: XpState, result: AttemptResult, hadMistake: boolean): { state: XpState; event: XpEvent } {
  const breakdown = ['+10 base'];
  let base = 10;
  if (result.tps > 10) { base += 10; breakdown.push('+10 TPS>10'); }
  else if (result.tps > 5) { base += 5; breakdown.push('+5 TPS>5'); }
  if (result.recognitionMs < 1000) { base += 7; breakdown.push('+7 fast recog'); }
  else if (result.recognitionMs < 2000) { base += 3; breakdown.push('+3 recog<2s'); }
  if (!hadMistake) { base += 5; breakdown.push('+5 clean setup'); }
  const mult = hadMistake ? 1 : Math.min(1 + prev.streak * 0.1, 2);
  if (mult > 1) breakdown.push(`×${mult.toFixed(1)} streak`);
  const gained = Math.round(base * mult);
  const totalXp = prev.totalXp + gained;
  const { level, xpToNext } = computeLevel(totalXp);
  const streak = hadMistake ? 0 : prev.streak + 1;
  return {
    state: { totalXp, level, xpToNext, streak, longestStreak: Math.max(prev.longestStreak, streak) },
    event: { gained, newLevel: level > prev.level ? level : undefined, breakdown },
  };
}

export function useXpSystem() {
  const [xpState, setXpState] = useState<XpState>(loadXpState);
  const currentRef = useRef(xpState);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(xpState));
  }, [xpState]);
  const recordAttempt = useCallback((result: AttemptResult, hadMistake: boolean): XpEvent => {
    const reward = awardXp(currentRef.current, result, hadMistake);
    currentRef.current = reward.state;
    setXpState(reward.state);
    return reward.event;
  }, []);
  return { xpState, recordAttempt, levelName, xpForLevel, LEVEL_THRESHOLDS };
}
