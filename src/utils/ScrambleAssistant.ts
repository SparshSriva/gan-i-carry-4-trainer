/**
 * ScrambleAssistant — core state machine for the Dynamic Scramble Assistant.
 *
 * Responsibilities:
 *  - Tracks position within a scramble sequence.
 *  - Handles R+R → R2 double-turn merging without losing partial-turn state.
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


export class ScrambleAssistant {
  private tokens: ScrambleToken[];
  private cursor: number = 0;
  private correctionQueue: string[] = [];
  private pendingHalfMove: { move: string } | null = null;
  private onChange: (snap: ScrambleAssistantSnapshot) => void;

  constructor(scrambleAlg: string, onChange: (snap: ScrambleAssistantSnapshot) => void) {
    this.tokens = parseAlg(scrambleAlg).map(m => ({ move: m, state: 'pending' as const }));
    if (this.tokens.length > 0) this.tokens[0].state = 'active';
    this.onChange = onChange;
  }

  /** Feed a physical move from the hardware or keyboard simulator. */
  feedMove(physicalMove: string): void {

    // ── Correction queue takes priority ───────────────────────────────────────
    if (this.correctionQueue.length > 0) {
      const expected = this.correctionQueue[0];
      if (expected.endsWith('2') && physicalMove[0] === expected[0] && !physicalMove.endsWith('2')) {
        this.correctionQueue[0] = physicalMove;
        this.emit();
      } else if (physicalMove === expected) {
        this.correctionQueue.shift();
        if (this.correctionQueue.length === 0) {
          if (!this.pendingHalfMove) this.setTokenActive(this.cursor);
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

    // A half turn is state, not a timing gesture: slow turns still count.
    if (physicalMove === target && !this.pendingHalfMove) {
      this.markDone();
      return;
    }
    if (target.endsWith('2') && physicalMove[0] === target[0]) {
      if (this.pendingHalfMove) {
        const merged = mergeMoves(this.pendingHalfMove.move, physicalMove);
        if (merged === target) {
          this.pendingHalfMove = null;
          this.markDone();
          return;
        }
        if (merged === null) {
          this.pendingHalfMove = null;
          this.setTokenActive(this.cursor);
          this.emit();
          return;
        }
      } else if (!physicalMove.endsWith('2')) {
        this.pendingHalfMove = { move: physicalMove };
        this.tokens[this.cursor].state = 'half';
        this.emit();
        return;
      }
    }

    // ── Normal move check ─────────────────────────────────────────────────────
    if (physicalMove === target && !this.pendingHalfMove) {
      this.markDone();
    } else {
      // Wrong move — enter error recovery
      if (!this.pendingHalfMove) this.setTokenActive(this.cursor);
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
