import { AlgCase, AlgSubset } from '../types';

// ─── PLL Cases (21) ────────────────────────────────────────────────────────────

const PLL: Omit<AlgCase, 'status' | 'attempts' | 'avgRecognitionMs' | 'avgExecutionMs' | 'mistakeRate' | 'lastPracticed'>[] = [
  { id: 'pll-aa', subset: 'PLL', name: 'Aa Perm', alg: "x R' U R' D2 R U' R' D2 R2 x'" },
  { id: 'pll-ab', subset: 'PLL', name: 'Ab Perm', alg: "x R2 D2 R U R' D2 R U' R x'" },
  { id: 'pll-e',  subset: 'PLL', name: 'E Perm',  alg: "x' R U' R' D R U R' D' R U R' D R U' R' D' x" },
  { id: 'pll-f',  subset: 'PLL', name: 'F Perm',  alg: "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R" },
  { id: 'pll-ga', subset: 'PLL', name: 'Ga Perm', alg: "R2 U R' U R' U' R U' R2 U' D R' U R D'" },
  { id: 'pll-gb', subset: 'PLL', name: 'Gb Perm', alg: "R' U' R U D' R2 U R' U R U' R U' R2 D" },
  { id: 'pll-gc', subset: 'PLL', name: 'Gc Perm', alg: "R2 U' R U' R U R' U R2 U D' R U' R' D" },
  { id: 'pll-gd', subset: 'PLL', name: 'Gd Perm', alg: "R U R' U' D R2 U' R U' R' U R' U R2 D'" },
  { id: 'pll-h',  subset: 'PLL', name: 'H Perm',  alg: "M2 U M2 U2 M2 U M2" },
  { id: 'pll-ja', subset: 'PLL', name: 'Ja Perm', alg: "x R2 F R F' R U2 r' U r U2 x'" },
  { id: 'pll-jb', subset: 'PLL', name: 'Jb Perm', alg: "R U R' F' R U R' U' R' F R2 U' R'" },
  { id: 'pll-na', subset: 'PLL', name: 'Na Perm', alg: "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'" },
  { id: 'pll-nb', subset: 'PLL', name: 'Nb Perm', alg: "R' U R U' R' F' U' F R U R' F R' F' R U' R" },
  { id: 'pll-ra', subset: 'PLL', name: 'Ra Perm', alg: "R U R' F' R U2 R' U2 R' F R U R U2 R' U'" },
  { id: 'pll-rb', subset: 'PLL', name: 'Rb Perm', alg: "R' U2 R U2 R' F R U R' U' R' F' R2 U'" },
  { id: 'pll-t',  subset: 'PLL', name: 'T Perm',  alg: "R U R' U' R' F R2 U' R' U' R U R' F'" },
  { id: 'pll-ua', subset: 'PLL', name: 'Ua Perm', alg: "M2 U M U2 M' U M2" },
  { id: 'pll-ub', subset: 'PLL', name: 'Ub Perm', alg: "M2 U' M U2 M' U' M2" },
  { id: 'pll-v',  subset: 'PLL', name: 'V Perm',  alg: "R' U R' U' y R' F' R2 U' R' U R' F R F" },
  { id: 'pll-y',  subset: 'PLL', name: 'Y Perm',  alg: "F R U' R' U' R U R' F' R U R' U' R' F R F'" },
  { id: 'pll-z',  subset: 'PLL', name: 'Z Perm',  alg: "M' U M2 U M2 U M' U2 M2" },
];

// ─── OLL Cases (2-Look subset for now — all 57 to follow) ─────────────────────

const OLL: Omit<AlgCase, 'status' | 'attempts' | 'avgRecognitionMs' | 'avgExecutionMs' | 'mistakeRate' | 'lastPracticed'>[] = [
  // --- 2-Look OLL: Edge Orientation (EOLL) ---
  { id: 'oll-dot',    subset: 'OLL', name: 'Dot',        alg: "R U2 R2 F R F' U2 R' F R F'" },
  { id: 'oll-l',      subset: 'OLL', name: 'L-Shape',    alg: "F R U R' U' F' f R U R' U' f'" },
  { id: 'oll-line',   subset: 'OLL', name: 'Line',       alg: "f R U R' U' f'" },
  { id: 'oll-cross',  subset: 'OLL', name: 'Cross',      alg: "R U R' U R U2 R'" }, // skip — cross already solved
  // --- 2-Look OLL: Corner Orientation (OCLL) ---
  { id: 'oll-sune',   subset: 'OLL', name: 'Sune',       alg: "R U R' U R U2 R'" },
  { id: 'oll-asune',  subset: 'OLL', name: 'Anti-Sune',  alg: "R U2 R' U' R U' R'" },
  { id: 'oll-h',      subset: 'OLL', name: 'OLL H',      alg: "F R U R' U' F' f R U R' U' f'" },
  { id: 'oll-l2',     subset: 'OLL', name: 'OLL L',      alg: "F' r U R' U' r' F R" },
  { id: 'oll-t',      subset: 'OLL', name: 'OLL T',      alg: "r U R' U' r' F R F'" },
  { id: 'oll-u',      subset: 'OLL', name: 'OLL U',      alg: "R2 D R' U2 R D' R' U2 R'" },
  { id: 'oll-pi',     subset: 'OLL', name: 'OLL Pi',     alg: "R U2 R2 U' R2 U' R2 U2 R" },
];

// ─── Factory: hydrate with default learning state ─────────────────────────────

function hydrate(
  raw: Omit<AlgCase, 'status' | 'attempts' | 'avgRecognitionMs' | 'avgExecutionMs' | 'mistakeRate' | 'lastPracticed'>[]
): AlgCase[] {
  return raw.map(c => ({
    ...c,
    status: 'unlearned',
    attempts: 0,
    avgRecognitionMs: 0,
    avgExecutionMs: 0,
    mistakeRate: 0,
  }));
}

export const ALL_CASES: AlgCase[] = [
  ...hydrate(PLL),
  ...hydrate(OLL),
];

export function getCasesBySubset(subset: AlgSubset): AlgCase[] {
  return ALL_CASES.filter(c => c.subset === subset);
}
