/**
 * CubeCanvas.tsx — Visualizer workspace featuring:
 * - 3D Interactive WebGL Cube (via Twisty3DView)
 * - Voxygen 2D Rubik's Cube (Stereographic Projection & 9 Closed Rails)
 * - Dual View (3D Cube alongside Voxygen's 2D Rubik's Cube)
 */

import React from 'react';
import VoxygenRubik2D from './VoxygenRubik2D';
import Twisty3DView from './Twisty3DView';

export type ViewMode = 'split' | '3d' | '2d';

interface CubeCanvasProps {
  setupAlg?: string;
  alg?: string;
  view?: ViewMode;
  lastMove?: string | null;
  onLayerClick?: (layer: string) => void;
}

export const CubeCanvas: React.FC<CubeCanvasProps> = ({
  setupAlg = '',
  alg = '',
  view = 'split',
  lastMove = null,
  onLayerClick,
}) => {
  // 1. Dual Split View: 3D WebGL Cube + Voxygen's 2D Rubik's Cube alongside
  if (view === 'split') {
    return (
      <div className="relative w-full aspect-square bg-zinc-900/90 rounded-2xl overflow-hidden grid grid-cols-2 gap-2 p-2 border border-zinc-800 shadow-xl">
        {/* Left: 3D Cube */}
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-zinc-950/80 rounded-xl overflow-hidden border border-zinc-800/60">
          <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-zinc-900/80 border border-zinc-700/60 text-[10px] font-mono text-zinc-400 pointer-events-none">
            3D Puzzle
          </div>
          <Twisty3DView setupAlg={setupAlg} alg={alg} visualization="PG3D" />
        </div>

        {/* Right: Voxygen 2D Model */}
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-zinc-950/80 rounded-xl overflow-hidden border border-zinc-800/60">
          <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-zinc-900/80 border border-zinc-700/60 text-[10px] font-mono text-zinc-400 pointer-events-none">
            2D Rails (Voxygen)
          </div>
          <VoxygenRubik2D lastMove={lastMove} onMoveExecuted={onLayerClick} />
        </div>
      </div>
    );
  }

  // 2. Full 2D View (Voxygen Rails)
  if (view === '2d') {
    return (
      <div className="relative w-full aspect-square bg-zinc-900/90 rounded-2xl overflow-hidden flex items-center justify-center p-2 border border-zinc-800 shadow-xl">
        <VoxygenRubik2D lastMove={lastMove} onMoveExecuted={onLayerClick} />
      </div>
    );
  }

  // 3. Full 3D View (Twisty3DView)
  return (
    <div className="relative w-full aspect-square bg-zinc-900/90 rounded-2xl overflow-hidden flex items-center justify-center border border-zinc-800 shadow-xl">
      <Twisty3DView setupAlg={setupAlg} alg={alg} visualization="PG3D" />
    </div>
  );
};

export default CubeCanvas;
