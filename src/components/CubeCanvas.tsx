/**
 * CubeCanvas.tsx — Multi-mode visualizer supporting:
 * - 3D Interactive WebGL Cube (cubing/twisty)
 * - 2D Flat Top-Down View (cubing/twisty 2D-LL)
 * - 2D Circular Permutation Diagram (PermGraph with cycle arrows)
 * - Split View (3D Cube + Circular Diagram side-by-side)
 */

import { useEffect, useRef } from 'react';
import PermGraph from './PermGraph';

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

export type ViewMode = '3d' | 'top' | 'graph' | 'split';

interface CubeCanvasProps {
  setupAlg?: string;
  alg?: string;
  view?: ViewMode;
  caseId?: string;
}

export default function CubeCanvas({
  setupAlg = '',
  alg = '',
  view = '3d',
  caseId = '',
}: CubeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    import('cubing/twisty').catch(() => {
      console.warn('cubing/twisty failed to load — fallback to 2D graph');
    });
  }, []);

  if (view === 'graph') {
    return (
      <div className="relative w-full aspect-square bg-zinc-900 rounded-xl overflow-hidden flex items-center justify-center p-3">
        <PermGraph algId={caseId} size={280} showArrows={true} />
      </div>
    );
  }

  if (view === 'split') {
    return (
      <div className="relative w-full aspect-square bg-zinc-900 rounded-xl overflow-hidden grid grid-cols-2 gap-2 p-2">
        <div className="relative w-full h-full flex items-center justify-center bg-zinc-950/60 rounded-lg overflow-hidden">
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
        <div className="relative w-full h-full flex items-center justify-center bg-zinc-950/60 rounded-lg p-1 overflow-hidden">
          <PermGraph algId={caseId} size={160} showArrows={true} />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-square bg-zinc-900 rounded-xl overflow-hidden flex items-center justify-center"
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
