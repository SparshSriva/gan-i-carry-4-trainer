/**
 * CubeCanvas.tsx — Multi-representation visualizer featuring:
 * - 3D Interactive WebGL Cube (cubing/twisty)
 * - NavaCakraYantra (2D Nine-Circles Permutation Graph with 54 sticker nodes)
 * - PermGraph (2D Last-Layer Cycle Diagram with arrows)
 * - Split View (3D Cube alongside the 2D Permutation Graph)
 */

import { useEffect, useRef } from 'react';
import NavaCakraYantra from './NavaCakraYantra';
import PermGraph from './PermGraph';
import { SOLVED_FACELETS } from '../data/navaCakraGeometry';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'twisty-player': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        puzzle?: string;
        alg?: string;
        'experimental-setup-alg'?: string;
        'hint-facelets'?: string;
        'back-view'?: string;
        visualization?: string;
        'control-panel'?: string;
        background?: string;
        'tempo-scale'?: string;
      };
    }
  }
}

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

export default function CubeCanvas({
  setupAlg = '',
  alg = '',
  view = 'split',
  caseId = '',
  facelets = SOLVED_FACELETS,
  lastMove = null,
  onLayerClick,
}: CubeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    import('cubing/twisty').catch(() => {
      console.warn('cubing/twisty failed to load — fallback to 2D graph');
    });
  }, []);

  // 1. Dual Split View (3D Cube + 2D Nine-Circles Permutation Graph alongside)
  if (view === 'split') {
    return (
      <div className="relative w-full aspect-square bg-zinc-900/90 rounded-2xl overflow-hidden grid grid-cols-2 gap-2 p-2 border border-zinc-800 shadow-xl">
        {/* Left: 3D Cube */}
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-zinc-950/80 rounded-xl overflow-hidden border border-zinc-800/60">
          <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-zinc-900/80 border border-zinc-700/60 text-[10px] font-mono text-zinc-400">
            3D Puzzle
          </div>
          <twisty-player
            puzzle="3x3x3"
            alg={alg}
            experimental-setup-alg={setupAlg}
            hint-facelets="none"
            back-view="none"
            visualization="PG3D"
            control-panel="none"
            background="none"
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        {/* Right: 2D Nine-Circles Permutation Graph */}
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-zinc-950/80 rounded-xl p-1 overflow-hidden border border-zinc-800/60">
          <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-zinc-900/80 border border-zinc-700/60 text-[10px] font-mono text-zinc-400">
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

  // 4. Standard 3D or 2D Top-Down
  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-square bg-zinc-900/90 rounded-2xl overflow-hidden flex items-center justify-center border border-zinc-800 shadow-xl"
    >
      <twisty-player
        puzzle="3x3x3"
        alg={alg}
        experimental-setup-alg={setupAlg}
        hint-facelets="none"
        back-view="none"
        visualization={view === 'top' ? 'experimental-2D-LL' : 'PG3D'}
        control-panel="none"
        background="none"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
