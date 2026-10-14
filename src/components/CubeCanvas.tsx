/**
 * CubeCanvas.tsx — Multi-representation visualizer featuring:
 * - 3D Interactive WebGL Cube (via Twisty3DView)
 * - NavaCakraYantra (2D Nine-Circles Permutation Graph with 54 sticker nodes)
 * - PermGraph (2D Last-Layer Cycle Diagram with arrows)
 * - Split View (3D Cube alongside the 2D Permutation Graph)
 */

import React from 'react';
import NavaCakraYantra from './NavaCakraYantra';
import PermGraph from './PermGraph';
import Twisty3DView from './Twisty3DView';
import { SOLVED_FACELETS } from '../data/navaCakraGeometry';

export type ViewMode = 'split' | '3d' | 'circles' | 'top' | 'layer';

interface CubeCanvasProps {
  setupAlg?: string;
  alg?: string;
  view?: ViewMode;
  caseId?: string;
  facelets?: string;
  lastMove?: string | null;
  onLayerClick?: (layer: string) => void;
}

export const CubeCanvas: React.FC<CubeCanvasProps> = ({
  setupAlg = '',
  alg = '',
  view = 'split',
  caseId = '',
  facelets = SOLVED_FACELETS,
  lastMove = null,
  onLayerClick,
}) => {
  // 1. Dual Split View (3D Cube + 2D Nine-Circles Permutation Graph side-by-side)
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

        {/* Right: 2D Nine-Circles Permutation Graph */}
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-zinc-950/80 rounded-xl p-1 overflow-hidden border border-zinc-800/60">
          <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-zinc-900/80 border border-zinc-700/60 text-[10px] font-mono text-zinc-400 pointer-events-none">
            2D Permutation Graph
          </div>
          <NavaCakraYantra
            facelets={facelets}
            lastMove={lastMove}
            size={180}
            showLabels={false}
            onLayerClick={onLayerClick}
          />
        </div>
      </div>
    );
  }

  // 2. Full 2D Nine-Circles Permutation Graph
  if (view === 'circles') {
    return (
      <div className="relative w-full aspect-square bg-zinc-900/90 rounded-2xl overflow-hidden flex items-center justify-center p-3 border border-zinc-800 shadow-xl">
        <NavaCakraYantra
          facelets={facelets}
          lastMove={lastMove}
          size={320}
          showLabels={true}
          onLayerClick={onLayerClick}
        />
      </div>
    );
  }

  // 3. Last-Layer Cycle Diagram
  if (view === 'layer') {
    return (
      <div className="relative w-full aspect-square bg-zinc-900/90 rounded-2xl overflow-hidden flex items-center justify-center p-3 border border-zinc-800 shadow-xl">
        <PermGraph algId={caseId} size={280} showArrows={true} />
      </div>
    );
  }

  // 4. Standard 3D View or 2D Top-Down View
  return (
    <div className="relative w-full aspect-square bg-zinc-900/90 rounded-2xl overflow-hidden flex items-center justify-center border border-zinc-800 shadow-xl">
      <Twisty3DView
        setupAlg={setupAlg}
        alg={alg}
        visualization={view === 'top' ? 'experimental-2D-LL' : 'PG3D'}
      />
    </div>
  );
};

export default CubeCanvas;
