/**
 * PermGraph.tsx — 2D Circular Permutation Diagram (Last Layer Visualizer).
 *
 * Provides:
 * - 3x3 U-face top-down sticker matrix.
 * - 12 outer ring stickers (top row of F, R, B, L faces, clockwise).
 * - High-clarity SVG curved permutation cycle arrows (corners & edges).
 * - Comprehensive case definitions for all 21 PLLs and 2-Look OLLs.
 */

import React from 'react';

export type WcaColor = 'W' | 'Y' | 'R' | 'O' | 'G' | 'B' | 'X';

export interface CaseState {
  uFace: WcaColor[];
  ring: WcaColor[];
}

export interface CycleArrow {
  from: number; // 0-11 on ring
  to: number;
  type: 'corner' | 'edge';
  bidirectional?: boolean;
}

export interface PermGraphProps {
  algId?: string;
  size?: number;
  showArrows?: boolean;
  className?: string;
}

// ─── Color Palette ────────────────────────────────────────────────────────────

const COLOR_HEX: Record<WcaColor, string> = {
  W: '#FFFFFF',
  Y: '#FFD700',
  R: '#DC2626',
  O: '#EA580C',
  G: '#16A34A',
  B: '#2563EB',
  X: '#3F3F46', // unoriented grey
};

// ─── Default Solved Last Layer ────────────────────────────────────────────────

const SOLVED_U: WcaColor[] = Array(9).fill('Y');
const SOLVED_RING: WcaColor[] = [
  'G', 'G', 'G', // F (0, 1, 2)
  'R', 'R', 'R', // R (3, 4, 5)
  'B', 'B', 'B', // B (6, 7, 8)
  'O', 'O', 'O', // L (9, 10, 11)
];

// ─── Full PLL States & Arrows ─────────────────────────────────────────────────

const CASE_STATES: Record<string, CaseState> = {
  // --- PLLs ---
  'pll-h': {
    uFace: SOLVED_U,
    ring: ['G', 'B', 'G', 'R', 'O', 'R', 'B', 'G', 'B', 'O', 'R', 'O'],
  },
  'pll-ua': {
    uFace: SOLVED_U,
    ring: ['G', 'R', 'G', 'R', 'B', 'R', 'B', 'G', 'B', 'O', 'O', 'O'],
  },
  'pll-ub': {
    uFace: SOLVED_U,
    ring: ['G', 'B', 'G', 'R', 'G', 'R', 'B', 'R', 'B', 'O', 'O', 'O'],
  },
  'pll-z': {
    uFace: SOLVED_U,
    ring: ['G', 'R', 'G', 'R', 'G', 'R', 'B', 'O', 'B', 'O', 'B', 'O'],
  },
  'pll-t': {
    uFace: SOLVED_U,
    ring: ['G', 'G', 'R', 'R', 'R', 'G', 'B', 'B', 'B', 'O', 'O', 'O'],
  },
  'pll-jb': {
    uFace: SOLVED_U,
    ring: ['G', 'G', 'R', 'B', 'R', 'R', 'B', 'B', 'B', 'O', 'O', 'O'],
  },
  'pll-ja': {
    uFace: SOLVED_U,
    ring: ['R', 'G', 'G', 'R', 'R', 'R', 'B', 'B', 'B', 'O', 'O', 'G'],
  },
  'pll-aa': {
    uFace: SOLVED_U,
    ring: ['B', 'G', 'G', 'R', 'R', 'O', 'G', 'B', 'B', 'O', 'O', 'R'],
  },
  'pll-ab': {
    uFace: SOLVED_U,
    ring: ['R', 'G', 'B', 'O', 'R', 'R', 'G', 'B', 'B', 'O', 'O', 'G'],
  },
  'pll-e': {
    uFace: SOLVED_U,
    ring: ['B', 'G', 'O', 'G', 'R', 'B', 'R', 'B', 'G', 'O', 'O', 'R'],
  },
  'pll-f': {
    uFace: SOLVED_U,
    ring: ['B', 'G', 'B', 'R', 'O', 'R', 'G', 'B', 'G', 'O', 'R', 'O'],
  },
  'pll-ga': {
    uFace: SOLVED_U,
    ring: ['R', 'G', 'G', 'O', 'R', 'R', 'B', 'B', 'O', 'G', 'O', 'B'],
  },
  'pll-gb': {
    uFace: SOLVED_U,
    ring: ['G', 'G', 'O', 'R', 'R', 'B', 'O', 'B', 'B', 'B', 'O', 'R'],
  },
  'pll-gc': {
    uFace: SOLVED_U,
    ring: ['O', 'G', 'G', 'B', 'R', 'R', 'R', 'B', 'B', 'G', 'O', 'O'],
  },
  'pll-gd': {
    uFace: SOLVED_U,
    ring: ['G', 'G', 'B', 'R', 'R', 'O', 'B', 'B', 'R', 'O', 'O', 'G'],
  },
  'pll-ra': {
    uFace: SOLVED_U,
    ring: ['G', 'R', 'O', 'B', 'G', 'R', 'B', 'B', 'B', 'R', 'O', 'G'],
  },
  'pll-rb': {
    uFace: SOLVED_U,
    ring: ['B', 'R', 'G', 'R', 'B', 'R', 'G', 'B', 'B', 'O', 'O', 'O'],
  },
  'pll-v': {
    uFace: SOLVED_U,
    ring: ['O', 'G', 'B', 'G', 'B', 'R', 'B', 'R', 'G', 'R', 'O', 'O'],
  },
  'pll-y': {
    uFace: SOLVED_U,
    ring: ['B', 'G', 'R', 'G', 'R', 'B', 'R', 'O', 'O', 'O', 'B', 'G'],
  },
  'pll-na': {
    uFace: SOLVED_U,
    ring: ['B', 'G', 'B', 'O', 'R', 'O', 'G', 'B', 'G', 'R', 'O', 'R'],
  },
  'pll-nb': {
    uFace: SOLVED_U,
    ring: ['R', 'G', 'R', 'B', 'R', 'B', 'O', 'B', 'O', 'G', 'O', 'G'],
  },

  // --- 2-Look OLLs (Orientation of Last Layer) ---
  'oll-sune': {
    uFace: ['X', 'Y', 'X', 'Y', 'Y', 'Y', 'X', 'Y', 'Y'],
    ring: ['X', 'X', 'Y', 'Y', 'X', 'X', 'X', 'X', 'Y', 'X', 'X', 'X'],
  },
  'oll-asune': {
    uFace: ['Y', 'Y', 'X', 'Y', 'Y', 'Y', 'X', 'Y', 'X'],
    ring: ['X', 'X', 'X', 'X', 'X', 'Y', 'Y', 'X', 'X', 'X', 'X', 'Y'],
  },
  'oll-h': {
    uFace: ['X', 'Y', 'X', 'Y', 'Y', 'Y', 'X', 'Y', 'X'],
    ring: ['X', 'X', 'X', 'Y', 'X', 'Y', 'X', 'X', 'X', 'Y', 'X', 'Y'],
  },
  'oll-pi': {
    uFace: ['X', 'Y', 'X', 'Y', 'Y', 'Y', 'X', 'Y', 'X'],
    ring: ['Y', 'X', 'Y', 'X', 'X', 'Y', 'X', 'X', 'X', 'X', 'X', 'Y'],
  },
  'oll-t': {
    uFace: ['X', 'Y', 'X', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y'],
    ring: ['X', 'X', 'X', 'Y', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'Y'],
  },
  'oll-u': {
    uFace: ['X', 'Y', 'X', 'Y', 'Y', 'Y', 'X', 'Y', 'X'],
    ring: ['Y', 'X', 'Y', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
  },
  'oll-l2': {
    uFace: ['X', 'Y', 'Y', 'Y', 'Y', 'Y', 'X', 'Y', 'X'],
    ring: ['X', 'X', 'X', 'X', 'X', 'Y', 'X', 'X', 'Y', 'Y', 'X', 'X'],
  },
  'oll-line': {
    uFace: ['X', 'X', 'X', 'Y', 'Y', 'Y', 'X', 'X', 'X'],
    ring: ['X', 'Y', 'X', 'X', 'X', 'X', 'X', 'Y', 'X', 'X', 'X', 'X'],
  },
  'oll-l': {
    uFace: ['X', 'Y', 'X', 'Y', 'Y', 'X', 'X', 'X', 'X'],
    ring: ['X', 'X', 'X', 'X', 'Y', 'X', 'X', 'X', 'X', 'X', 'X', 'Y'],
  },
  'oll-dot': {
    uFace: ['X', 'X', 'X', 'X', 'Y', 'X', 'X', 'X', 'X'],
    ring: ['X', 'Y', 'X', 'X', 'Y', 'X', 'X', 'Y', 'X', 'X', 'Y', 'X'],
  },
  'oll-cross': {
    uFace: ['X', 'Y', 'X', 'Y', 'Y', 'Y', 'X', 'Y', 'X'],
    ring: Array(12).fill('X'),
  },
};

// ─── Permutation Cycle Arrows (from → to ring index) ─────────────────────────

const CYCLE_ARROWS: Record<string, CycleArrow[]> = {
  // H Perm: cross edge swaps (F↔B, R↔L)
  'pll-h': [
    { from: 1, to: 7, type: 'edge', bidirectional: true },
    { from: 4, to: 10, type: 'edge', bidirectional: true },
  ],
  // Z Perm: adjacent edge swaps (F↔R, B↔L)
  'pll-z': [
    { from: 1, to: 4, type: 'edge', bidirectional: true },
    { from: 7, to: 10, type: 'edge', bidirectional: true },
  ],
  // Ua Perm: 3-cycle edges clockwise (F→R→B)
  'pll-ua': [
    { from: 1, to: 4, type: 'edge' },
    { from: 4, to: 7, type: 'edge' },
    { from: 7, to: 1, type: 'edge' },
  ],
  // Ub Perm: 3-cycle edges counter-clockwise (F→B→R)
  'pll-ub': [
    { from: 1, to: 7, type: 'edge' },
    { from: 7, to: 4, type: 'edge' },
    { from: 4, to: 1, type: 'edge' },
  ],
  // T Perm: corners 2↔5 (F-R ↔ R-B), edges 1↔7 (F ↔ B)
  'pll-t': [
    { from: 2, to: 5, type: 'corner', bidirectional: true },
    { from: 1, to: 7, type: 'edge', bidirectional: true },
  ],
  // Jb Perm: corners 2↔5, edges 1↔4
  'pll-jb': [
    { from: 2, to: 5, type: 'corner', bidirectional: true },
    { from: 1, to: 4, type: 'edge', bidirectional: true },
  ],
  // Ja Perm: corners 0↔11, edges 1↔10
  'pll-ja': [
    { from: 0, to: 11, type: 'corner', bidirectional: true },
    { from: 1, to: 10, type: 'edge', bidirectional: true },
  ],
  // Aa Perm: corners 3-cycle
  'pll-aa': [
    { from: 0, to: 2, type: 'corner' },
    { from: 2, to: 8, type: 'corner' },
    { from: 8, to: 0, type: 'corner' },
  ],
  // Ab Perm: corners 3-cycle reverse
  'pll-ab': [
    { from: 2, to: 0, type: 'corner' },
    { from: 0, to: 8, type: 'corner' },
    { from: 8, to: 2, type: 'corner' },
  ],
  // E Perm: diagonal corner 2-cycles
  'pll-e': [
    { from: 0, to: 8, type: 'corner', bidirectional: true },
    { from: 2, to: 6, type: 'corner', bidirectional: true },
  ],
  // Y Perm: diagonal corner swap + adjacent edge swap
  'pll-y': [
    { from: 0, to: 6, type: 'corner', bidirectional: true },
    { from: 1, to: 4, type: 'edge', bidirectional: true },
  ],
  // V Perm: diagonal corner swap + adjacent edge swap
  'pll-v': [
    { from: 0, to: 6, type: 'corner', bidirectional: true },
    { from: 4, to: 7, type: 'edge', bidirectional: true },
  ],
  // Ra Perm: corner swap + edge swap
  'pll-ra': [
    { from: 2, to: 5, type: 'corner', bidirectional: true },
    { from: 4, to: 7, type: 'edge', bidirectional: true },
  ],
  // Rb Perm: corner swap + edge swap
  'pll-rb': [
    { from: 0, to: 11, type: 'corner', bidirectional: true },
    { from: 7, to: 10, type: 'edge', bidirectional: true },
  ],
};

// ─── Geometry Calculation ─────────────────────────────────────────────────────

function ringCenter(i: number, size: number): [number, number] {
  const cx = size / 2;
  const cy = size / 2;
  const uHalf = size * 0.22;
  const ringH = size * 0.09;
  const cellW = (uHalf * 2) / 3;

  if (i <= 2) {
    // Bottom (F face in top-down view)
    const x = -uHalf + cellW * i + cellW / 2;
    const y = uHalf + ringH / 2;
    return [cx + x, cy + y];
  } else if (i <= 5) {
    // Right (R face)
    const j = i - 3;
    const x = uHalf + ringH / 2;
    const y = -uHalf + cellW * j + cellW / 2;
    return [cx + x, cy + y];
  } else if (i <= 8) {
    // Top (B face)
    const j = i - 6;
    const x = uHalf - cellW * j - cellW / 2;
    const y = -(uHalf + ringH / 2);
    return [cx + x, cy + y];
  } else {
    // Left (L face)
    const j = i - 9;
    const x = -(uHalf + ringH / 2);
    const y = uHalf - cellW * j - cellW / 2;
    return [cx + x, cy + y];
  }
}

function controlPoint(
  x1: number, y1: number,
  x2: number, y2: number,
  cx: number, cy: number,
  pull: number
): [number, number] {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  return [midX + (cx - midX) * pull, midY + (cy - midY) * pull];
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PermGraph: React.FC<PermGraphProps> = ({
  algId = '',
  size = 220,
  showArrows = true,
  className = '',
}) => {
  const state: CaseState = (algId && CASE_STATES[algId]) || {
    uFace: SOLVED_U,
    ring: SOLVED_RING,
  };
  const arrows: CycleArrow[] = (showArrows && algId && CYCLE_ARROWS[algId]) || [];

  const cx = size / 2;
  const cy = size / 2;
  const uHalf = size * 0.22;
  const ringH = size * 0.09;
  const cellW = (uHalf * 2) / 3;
  const cornerR = size * 0.015;

  // U-face stickers
  const uCells: React.ReactNode[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const idx = row * 3 + col;
      const x = cx - uHalf + col * cellW;
      const y = cy - uHalf + row * cellW;
      uCells.push(
        <rect
          key={`u-${idx}`}
          x={x + 1}
          y={y + 1}
          width={cellW - 2}
          height={cellW - 2}
          rx={cornerR}
          fill={COLOR_HEX[state.uFace[idx] ?? 'Y']}
          stroke="#09090b"
          strokeWidth={1}
        />
      );
    }
  }

  // Ring stickers
  const ringCells: React.ReactNode[] = [];
  for (let i = 0; i < 12; i++) {
    const [rcx, rcy] = ringCenter(i, size);
    const isHoriz = i <= 2 || (i >= 6 && i <= 8);
    const w = isHoriz ? cellW - 2 : ringH - 2;
    const h = isHoriz ? ringH - 2 : cellW - 2;

    ringCells.push(
      <rect
        key={`ring-${i}`}
        x={rcx - w / 2}
        y={rcy - h / 2}
        width={w}
        height={h}
        rx={cornerR}
        fill={COLOR_HEX[state.ring[i] ?? 'X']}
        stroke="#09090b"
        strokeWidth={1}
      />
    );
  }

  // Arrows
  const arrowScale = size / 200;
  const cornerStroke = 2.4 * arrowScale;
  const edgeStroke = 2.0 * arrowScale;
  const markerSize = 6;

  const arrowPaths = arrows.map((arrow, ai) => {
    const [x1, y1] = ringCenter(arrow.from, size);
    const [x2, y2] = ringCenter(arrow.to, size);
    const pull = arrow.type === 'corner' ? 0.45 : 0.35;
    const [cpx, cpy] = controlPoint(x1, y1, x2, y2, cx, cy, pull);

    const color = arrow.type === 'corner' ? '#F97316' : '#3B82F6';
    const sw = arrow.type === 'corner' ? cornerStroke : edgeStroke;
    const markerId = `perm-arr-${arrow.type}-${ai}`;

    return (
      <g key={`arrow-${ai}`}>
        <defs>
          <marker
            id={markerId}
            markerWidth={markerSize}
            markerHeight={markerSize}
            refX={markerSize - 1}
            refY={markerSize / 2}
            orient="auto"
          >
            <path
              d={`M0,1 L${markerSize - 1},${markerSize / 2} L0,${markerSize - 1} Z`}
              fill={color}
            />
          </marker>
        </defs>
        <path
          d={`M${x1},${y1} Q${cpx},${cpy} ${x2},${y2}`}
          stroke={color}
          strokeWidth={sw}
          fill="none"
          strokeLinecap="round"
          markerEnd={`url(#${markerId})`}
          className="drop-shadow-md"
        />
      </g>
    );
  });

  return (
    <div className={`relative inline-flex flex-col items-center select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rounded-xl bg-zinc-900 border border-zinc-700/60 shadow-inner"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background circle / frame */}
        <circle cx={cx} cy={cy} r={size * 0.46} fill="#18181b" />

        {/* Outer Ring stickers */}
        {ringCells}

        {/* U-face inner backing */}
        <rect
          x={cx - uHalf}
          y={cy - uHalf}
          width={uHalf * 2}
          height={uHalf * 2}
          rx={cornerR * 2}
          fill="#111827"
          stroke="#27272a"
          strokeWidth={2}
        />

        {/* U-face stickers */}
        {uCells}

        {/* Cycle Arrows */}
        {arrowPaths}

        {/* Center dot */}
        <circle cx={cx} cy={cy} r={size * 0.02} fill="#71717a" opacity={0.6} />
      </svg>
    </div>
  );
};

export default PermGraph;
