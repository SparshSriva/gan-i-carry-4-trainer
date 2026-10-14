/**
 * faceletSimulator.ts — Mathematical permutation engine for 54-facelet state strings.
 *
 * Facelet indexing convention (54 characters):
 *   00..08: U (Up, White)
 *   09..17: R (Right, Red)
 *   18..26: F (Front, Green)
 *   27..35: D (Down, Yellow)
 *   36..44: L (Left, Orange)
 *   45..53: B (Back, Blue)
 */

import { NAVA_CAKRA_MOVES, SOLVED_FACELETS } from '../data/navaCakraGeometry';
import { parseAlg } from './moveUtils';

/** Apply a single move to a 54-character facelet string */
export function applyFaceletMove(state: string, move: string): string {
  const perm = NAVA_CAKRA_MOVES[move];
  if (!perm) {
    // If it's a wide move like 'r', decompose into R + M'
    if (move === 'r') return applyFaceletMove(applyFaceletMove(state, 'R'), "M'");
    if (move === "r'") return applyFaceletMove(applyFaceletMove(state, "R'"), 'M');
    if (move === 'r2') return applyFaceletMove(applyFaceletMove(state, 'R2'), 'M2');
    if (move === 'l') return applyFaceletMove(applyFaceletMove(state, 'L'), 'M');
    if (move === "l'") return applyFaceletMove(applyFaceletMove(state, "L'"), "M'");
    if (move === 'l2') return applyFaceletMove(applyFaceletMove(state, 'L2'), 'M2');
    return state;
  }

  let out = '';
  for (let i = 0; i < 54; i++) {
    out += state[perm[i]];
  }
  return out;
}

/** Apply a full space-delimited algorithm or setup scramble */
export function applyFaceletAlg(startState: string = SOLVED_FACELETS, alg: string): string {
  const moves = parseAlg(alg);
  let cur = startState;
  for (const m of moves) {
    cur = applyFaceletMove(cur, m);
  }
  return cur;
}
