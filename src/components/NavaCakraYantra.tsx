/**
 * NavaCakraYantra.tsx (नवचक्रयन्त्र — The Nine Interlocking Circles Permutation Engine)
 *
 * Implements the mathematical 2D graph model of the Rubik's Cube:
 * - 9 intersecting circular tracks representing the 9 rotatable layers of the 3x3 cube
 *   (3 layers along X [L, M, R], Y [U, E, D], and Z [F, S, B]).
 * - 54 node intersections representing the 54 individual colored stickers (facelets).
 * - Every physical layer turn rotates its circular track and shifts its 12 nodes along the belt.
 */

import React, { useMemo } from 'react';
import {
  NAVA_CAKRA_CIRCLES,
  NAVA_CAKRA_NODES,
  NAVA_CAKRA_NODE_SCALES,
  SOLVED_FACELETS,
  FACELET_COLORS,
  CakraCircle,
} from '../data/navaCakraGeometry';

export interface NavaCakraYantraProps {
  facelets?: string;        // 54-char string (e.g. UUUUUUUUURRRRRRRRR...)
  lastMove?: string | null; // e.g. "R", "U'", "F2"
  size?: number;            // px size
  showLabels?: boolean;
  onLayerClick?: (layer: string) => void;
  className?: string;
}

// Axis color accents
const AXIS_STROKES = [
  'stroke-orange-500/40', // X-axis (L, M, R)
  'stroke-sky-500/40',    // Y-axis (U, E, D)
  'stroke-emerald-500/40',// Z-axis (F, S, B)
];

const AXIS_ACTIVE_STROKES: Record<string, string> = {
  L: '#F97316', M: '#FB923C', R: '#EA580C',
  U: '#38BDF8', E: '#0284C7', D: '#0369A1',
  F: '#22C55E', S: '#16A34A', B: '#15803D',
};

export const NavaCakraYantra: React.FC<NavaCakraYantraProps> = ({
  facelets = SOLVED_FACELETS,
  lastMove = null,
  size = 320,
  showLabels = true,
  onLayerClick,
  className = '',
}) => {
  // Ensure valid 54-char facelets string
  const currentFacelets = useMemo(() => {
    if (!facelets || facelets.length !== 54) return SOLVED_FACELETS;
    return facelets;
  }, [facelets]);

  const activeFace = lastMove ? lastMove[0].toUpperCase() : null;

  // Active circle metadata for cycle readout
  const activeCircle = useMemo<CakraCircle | undefined>(() => {
    if (!activeFace) return undefined;
    return NAVA_CAKRA_CIRCLES.find(c => c.name === activeFace);
  }, [activeFace]);

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          viewBox="-4.3 -4.3 8.6 8.6"
          className="w-full h-full rounded-2xl bg-zinc-950/90 border border-zinc-800 shadow-2xl overflow-hidden"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Ambient grid pattern */}
            <radialGradient id="nava-center-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#312E81" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#09090B" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background ambient lighting */}
          <circle cx="0" cy="0" r="4.2" fill="url(#nava-center-glow)" />

          {/* ── 9 Intersecting Circles (Tracks) ────────────────────────── */}
          <g className="circles-layer">
            {NAVA_CAKRA_CIRCLES.map((c) => {
              const isActive = activeFace === c.name;
              const strokeColor = isActive
                ? (AXIS_ACTIVE_STROKES[c.name] || '#F59E0B')
                : undefined;

              return (
                <circle
                  key={`circle-${c.name}`}
                  cx={c.cx}
                  cy={-c.cy}
                  r={c.r}
                  fill="none"
                  stroke={strokeColor || '#3F3F46'}
                  strokeWidth={isActive ? 0.045 : 0.018}
                  strokeDasharray={isActive ? undefined : '0.04 0.02'}
                  className={`transition-all duration-300 ${
                    isActive
                      ? 'filter drop-shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse'
                      : AXIS_STROKES[c.axis]
                  }`}
                />
              );
            })}
          </g>

          {/* ── 54 Sticker Nodes (Facelets) ───────────────────────────── */}
          <g className="nodes-layer">
            {NAVA_CAKRA_NODES.map(([x, y], idx) => {
              const faceCode = currentFacelets[idx] || 'U';
              const color = FACELET_COLORS[faceCode] || '#71717A';
              const scale = NAVA_CAKRA_NODE_SCALES[idx] || 1.0;
              const r = 0.065 * scale;
              const isBelongingToActiveBelt =
                activeCircle && activeCircle.belt.includes(idx);

              return (
                <g key={`node-${idx}`}>
                  {/* Subtle node pulse halo when belonging to active turning layer */}
                  {isBelongingToActiveBelt && (
                    <circle
                      cx={x}
                      cy={-y}
                      r={r * 1.5}
                      fill="none"
                      stroke={color}
                      strokeWidth={0.015}
                      opacity={0.6}
                    />
                  )}
                  {/* Main sticker node dot */}
                  <circle
                    cx={x}
                    cy={-y}
                    r={r}
                    fill={color}
                    stroke="#09090B"
                    strokeWidth={0.012}
                    className="transition-colors duration-150 drop-shadow-sm hover:scale-125"
                  >
                    <title>{`Sticker #${idx} [Face: ${faceCode}]`}</title>
                  </circle>
                </g>
              );
            })}
          </g>
        </svg>

        {/* ── Layer Circle Clickable Badges ───────────────────────────── */}
        {showLabels && (
          <div className="absolute inset-x-2 top-2 flex flex-wrap justify-between items-center px-1 pointer-events-none">
            <div className="flex gap-1 pointer-events-auto">
              {['U', 'L', 'F', 'R', 'B', 'D'].map((layer) => (
                <button
                  key={layer}
                  onClick={() => onLayerClick && onLayerClick(layer)}
                  className={`w-6 h-6 rounded text-[10px] font-mono font-bold border transition-all ${
                    activeFace === layer
                      ? 'bg-amber-500 border-amber-300 text-black shadow-lg scale-110'
                      : 'bg-zinc-900/90 border-zinc-700/80 text-zinc-300 hover:text-white hover:border-zinc-500'
                  }`}
                >
                  {layer}
                </button>
              ))}
            </div>
            <span className="text-[10px] font-mono font-semibold text-zinc-400 bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800">
              9 Tracks • 54 Nodes
            </span>
          </div>
        )}
      </div>

      {/* Cycle group-theory banner readout */}
      {activeCircle && (
        <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400 font-mono bg-zinc-900/80 px-3 py-1 rounded-lg border border-zinc-800">
          <span className="text-amber-400 font-bold">Track {activeCircle.name}:</span>
          <span>{activeCircle.cycle.join(' → ')}</span>
        </div>
      )}
    </div>
  );
};

export default NavaCakraYantra;
