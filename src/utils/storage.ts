/**
 * storage.ts — localStorage persistence for algorithm case states and
 * attempt history.  All reads fall back to defaults so the app works
 * on first launch with no prior data.
 */

import { AlgCase, AttemptResult } from '../types';
import { ALL_CASES } from '../data/algDatabase';

const CASES_KEY = 'ganicv4_cases_v1';
const HISTORY_KEY = 'ganicv4_history_v1';

// ─── Case States ──────────────────────────────────────────────────────────────

export function loadCases(): AlgCase[] {
  try {
    const raw = localStorage.getItem(CASES_KEY);
    if (!raw) return ALL_CASES;
    const saved: Record<string, Partial<AlgCase>> = JSON.parse(raw);
    return ALL_CASES.map(base => ({
      ...base,
      ...(saved[base.id] ?? {}),
    }));
  } catch {
    return ALL_CASES;
  }
}

export function saveCases(cases: AlgCase[]): void {
  const map: Record<string, Partial<AlgCase>> = {};
  for (const c of cases) {
    map[c.id] = {
      status: c.status,
      attempts: c.attempts,
      lastPracticed: c.lastPracticed,
      avgRecognitionMs: c.avgRecognitionMs,
      avgExecutionMs: c.avgExecutionMs,
      mistakeRate: c.mistakeRate,
    };
  }
  localStorage.setItem(CASES_KEY, JSON.stringify(map));
}

// ─── Attempt History ──────────────────────────────────────────────────────────

export function loadHistory(): AttemptResult[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function appendAttempt(result: AttemptResult): void {
  const history = loadHistory();
  history.push(result);
  // Keep last 2000 attempts to bound storage size
  if (history.length > 2000) history.splice(0, history.length - 2000);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// ─── Rolling Stats Update ─────────────────────────────────────────────────────

/** Update a case's rolling averages after a completed attempt. */
export function updateCaseStats(
  cases: AlgCase[],
  result: AttemptResult,
  hadMistake: boolean
): AlgCase[] {
  return cases.map(c => {
    if (c.id !== result.caseId) return c;
    const n = c.attempts + 1;
    const alpha = 0.2; // exponential moving average weight
    return {
      ...c,
      attempts: n,
      lastPracticed: result.timestamp,
      avgRecognitionMs: c.attempts === 0
        ? result.recognitionMs
        : c.avgRecognitionMs * (1 - alpha) + result.recognitionMs * alpha,
      avgExecutionMs: c.attempts === 0
        ? result.executionMs
        : c.avgExecutionMs * (1 - alpha) + result.executionMs * alpha,
      mistakeRate: c.attempts === 0
        ? (hadMistake ? 1 : 0)
        : c.mistakeRate * (1 - alpha) + (hadMistake ? 1 : 0) * alpha,
    };
  });
}
