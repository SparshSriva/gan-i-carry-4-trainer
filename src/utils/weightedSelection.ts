/**
 * weightedSelection.ts — weighted random case selector.
 *
 * Weight factors:
 *   1. Mistake rate (higher = heavier weight)
 *   2. Execution time relative to user's rolling median (slower = heavier)
 *   3. Recency — time since last practiced (longer ago = heavier)
 */

import { AlgCase, LearningStatus } from '../types';

interface SelectionOptions {
  statusFilter: LearningStatus[];
  subsetFilter?: string[];
}

function caseWeight(c: AlgCase, medianExecMs: number, now: number): number {
  const mistakeScore = c.mistakeRate;                       // 0–1
  const speedScore = c.avgExecutionMs > 0
    ? Math.min(c.avgExecutionMs / (medianExecMs || 1000), 3)
    : 1;
  const recencyMs = c.lastPracticed ? now - c.lastPracticed : Infinity;
  const recencyScore = Math.min(recencyMs / (24 * 60 * 60 * 1000), 3); // max 3× after 3 days

  return 1 + mistakeScore * 2 + speedScore * 0.5 + recencyScore * 0.5;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 1000;
  const sorted = [...nums].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

export function selectNextCase(cases: AlgCase[], opts: SelectionOptions): AlgCase | null {
  const pool = cases.filter(c =>
    opts.statusFilter.includes(c.status) &&
    (!opts.subsetFilter || opts.subsetFilter.includes(c.subset))
  );
  if (pool.length === 0) return null;

  const now = Date.now();
  const medianExec = median(pool.filter(c => c.avgExecutionMs > 0).map(c => c.avgExecutionMs));
  const weights = pool.map(c => caseWeight(c, medianExec, now));
  const total = weights.reduce((a, b) => a + b, 0);

  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}
