/** Independent geometric move model for the six-face rail projection. */
export interface RailSticker { p: number[]; color: string }
export interface RailTurn { axis: number; layers: number[]; dir: number; dur: number }
export const RAIL_COLORS = ['#DC2626', '#EA580C', '#FFFFFF', '#FFD700', '#16A34A', '#2563EB'];
export const RAIL_PITCH = 2 / 3;

export function rotate90(p: number[], axis: number, dir: number): number[] {
  const c1 = (axis + 1) % 3, c2 = (axis + 2) % 3;
  const q = p.slice();
  if (dir > 0) { q[c1] = -p[c2]; q[c2] = p[c1]; }
  else { q[c1] = p[c2]; q[c2] = -p[c1]; }
  return q;
}

export function solvedStickers(): RailSticker[] {
  const stickers: RailSticker[] = [];
  for (let axis = 0; axis < 3; axis++) {
    for (const [index, sign] of [1, -1].entries()) {
      for (const u of [-RAIL_PITCH, 0, RAIL_PITCH]) for (const v of [-RAIL_PITCH, 0, RAIL_PITCH]) {
        const p = [0, 0, 0]; p[axis] = sign; p[(axis + 1) % 3] = u; p[(axis + 2) % 3] = v;
        stickers.push({ p, color: RAIL_COLORS[axis * 2 + index] });
      }
    }
  }
  return stickers;
}

export function railTurns(move: string): RailTurn[] {
  const notation: Record<string, [number, number[], number]> = {
    R: [0, [1], -1], L: [0, [-1], 1], U: [1, [1], -1], D: [1, [-1], 1], F: [2, [1], -1], B: [2, [-1], 1],
    M: [0, [0], 1], E: [1, [0], 1], S: [2, [0], -1],
    r: [0, [0, 1], -1], l: [0, [-1, 0], 1], u: [1, [0, 1], -1], d: [1, [-1, 0], 1], f: [2, [0, 1], -1], b: [2, [-1, 0], 1],
    x: [0, [-1, 0, 1], -1], y: [1, [-1, 0, 1], -1], z: [2, [-1, 0, 1], -1],
  };
  const entry = notation[move[0]];
  if (!entry || !/^[RLUDFBrludfbMESxyz][2']?$/.test(move)) throw new Error(`Unsupported rail move: ${move}`);
  const [axis, layers, clockwise] = entry;
  const dir = move.endsWith("'") ? -clockwise : clockwise;
  return Array.from({ length: move.endsWith('2') ? 2 : 1 }, () => ({ axis, layers, dir, dur: move.endsWith('2') ? 100 : 160 }));
}

export function isInTurn(sticker: RailSticker, turn: Pick<RailTurn, 'axis' | 'layers'>): boolean {
  return turn.layers.includes(Math.round(sticker.p[turn.axis]));
}

export function applyRailTurn(stickers: RailSticker[], turn: RailTurn): void {
  for (const sticker of stickers) if (isInTurn(sticker, turn)) sticker.p = rotate90(sticker.p, turn.axis, turn.dir);
}
