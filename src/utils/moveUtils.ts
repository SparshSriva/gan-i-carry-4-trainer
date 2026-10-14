/**
 * moveUtils.ts — algebraic move manipulation
 *
 * Covers:
 *  - Parsing a WCA notation alg string into token array
 *  - Inverting a single move or full alg
 *  - Merging two sequential same-face moves (R + R → R2, R + R' → ∅)
 *  - ETM move count
 */

export function parseAlg(alg: string): string[] {
  // Matches wide (r, u, …), slice (M, E, S), rotations (x, y, z), standard faces
  return alg.match(/[RLUDFBrludfbMESxyz][2']?/g) ?? [];
}

const PRIME: Record<string, string> = {
  '': "'", "'": '', '2': '2',
};

export function invertMove(move: string): string {
  const face = move[0];
  const suffix = move.slice(1);
  return face + PRIME[suffix];
}

export function invertAlg(alg: string): string {
  return parseAlg(alg).reverse().map(invertMove).join(' ');
}

/**
 * Merge two consecutive same-face single/double/prime moves.
 * Returns null if they cancel; returns the merged token otherwise.
 */
export function mergeMoves(a: string, b: string): string | null {
  if (a[0] !== b[0]) return undefined as unknown as null; // different faces
  const mod = (moveToQuarterTurns(a) + moveToQuarterTurns(b)) % 4;
  if (mod === 0) return null; // cancel
  return a[0] + quarterTurnsToSuffix((mod + 4) % 4);
}

function moveToQuarterTurns(move: string): number {
  const suffix = move.slice(1);
  if (suffix === '') return 1;
  if (suffix === "'") return 3;
  if (suffix === '2') return 2;
  return 0;
}

function quarterTurnsToSuffix(q: number): string {
  if (q === 1) return '';
  if (q === 2) return '2';
  if (q === 3) return "'";
  return '';
}

/** ETM (Execution Turn Metric) count — each outer/wide move = 1, each slice = 1 */
export function etmCount(alg: string): number {
  return parseAlg(alg).length;
}
