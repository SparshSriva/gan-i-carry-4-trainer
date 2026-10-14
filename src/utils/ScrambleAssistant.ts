/**
 * ScrambleAssistant — core state machine for the Dynamic Scramble Assistant.
 *
 * Responsibilities:
 *  - Tracks position within a scramble sequence.
 *  - Handles R+R → R2 double-turn merging with a 250 ms window.
 *  - Detects wrong moves, builds a correction queue, and resumes on fix.
 *  - Emits events upstream via the `onChange` callback.
 */

import { parseAlg, invertMove, mergeMoves } from './moveUtils';

export type ScrambleToken = {
  move: string;
  state: 'done' | 'active' | 'pending' | 'half'; // 'half' = first turn of R2 received
};

export type AssistantState = 'scrambling' | 'error_recovery' | 'done';

export interface ScrambleAssistantSnapshot {
  tokens: ScrambleToken[];
  assistantState: AssistantState;
  correctionQueue: string[];
}

const DOUBLE_TURN_WINDOW_MS = 250;

export class ScrambleAssistant {
  private tokens: ScrambleToken[];
  private cursor: number = 0;
  private correctionQueue: string[] = [];
  private pendingHalfMove: { move: string; ts: number } | null = null;
  private onChange: (snap: ScrambleAssistantSnapshot) => void;

  constructor(scrambleAlg: string, onChange: (snap: ScrambleAssistantSnapshot) => void) {
    this.tokens = parseAlg(scrambleAlg).map(m => ({ move: m, state: 'pending' as const }));
    if (this.tokens.length > 0) this.tokens[0].state = 'active';
    this.onChange = onChange;
  }

  /** Feed a physical move from the hardware or keyboard simulator. */
  feedMove(physicalMove: string): void {
    const now = Date.now();

    // ── Correction queue takes priority ───────────────────────────────────────
    if (this.correctionQueue.length > 0) {
      const expected = this.correctionQueue[0];
      if (physicalMove === expected) {
        this.correctionQueue.shift();
        if (this.correctionQueue.length === 0) {
          this.setTokenActive(this.cursor);
        }
        this.emit();
      } else {
        // Wrong correction — stack another inverse
        this.correctionQueue.unshift(invertMove(physicalMove));
        this.emit();
      }
      return;
    }

    // ── No more tokens ────────────────────────────────────────────────────────
    if (this.cursor >= this.tokens.length) return;

    const target = this.tokens[this.cursor].move;

    // ── Double-turn handling ──────────────────────────────────────────────────
    if (target.endsWith('2')) {
      const singleFace = target[0];
      if (this.pendingHalfMove?.move[0] === singleFace) {
        // Second physical turn for a double — check it matches within window
        if (now - this.pendingHalfMove.ts <= DOUBLE_TURN_WINDOW_MS) {
          const merged = mergeMoves(this.pendingHalfMove.move, physicalMove);
          if (merged === target) {
            this.pendingHalfMove = null;
            this.markDone();
            return;
          }
        }
        // Timeout or mismatch — treat old half as a wrong move
        this.pendingHalfMove = null;
      }

      if (physicalMove[0] === singleFace) {
        // First physical turn toward a double-turn target
        this.pendingHalfMove = { move: physicalMove, ts: now };
        this.tokens[this.cursor] = { ...this.tokens[this.cursor], state: 'half' };
        this.emit();
        return;
      }
    }

    this.pendingHalfMove = null;

    // ── Normal move check ─────────────────────────────────────────────────────
    if (physicalMove === target) {
      this.markDone();
    } else {
      // Wrong move — enter error recovery
      this.tokens[this.cursor] = { ...this.tokens[this.cursor], state: 'active' };
      this.correctionQueue.push(invertMove(physicalMove));
      this.emit();
    }
  }

  private markDone(): void {
    this.tokens[this.cursor] = { ...this.tokens[this.cursor], state: 'done' };
    this.cursor++;
    if (this.cursor < this.tokens.length) {
      this.setTokenActive(this.cursor);
    }
    this.emit();
  }

  private setTokenActive(idx: number): void {
    this.tokens[idx] = { ...this.tokens[idx], state: 'active' };
  }

  get isDone(): boolean {
    return this.cursor >= this.tokens.length && this.correctionQueue.length === 0;
  }

  get assistantState(): AssistantState {
    if (this.isDone) return 'done';
    if (this.correctionQueue.length > 0) return 'error_recovery';
    return 'scrambling';
  }

  snapshot(): ScrambleAssistantSnapshot {
    return {
      tokens: [...this.tokens.map(t => ({ ...t }))],
      assistantState: this.assistantState,
      correctionQueue: [...this.correctionQueue],
    };
  }

  private emit(): void {
    this.onChange(this.snapshot());
  }
}
