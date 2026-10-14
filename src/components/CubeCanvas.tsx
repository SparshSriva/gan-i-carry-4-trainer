/**
 * CubeCanvas — 3D cube viewer powered by cubing/twisty.
 *
 * Uses a <twisty-player> custom element from the cubing package.
 * We declare the custom element type so TypeScript stops complaining.
 */

import { useEffect, useRef } from 'react';

// Augment JSX for the custom element
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

interface CubeCanvasProps {
  setupAlg?: string;   // positions the cube before showing
  alg?: string;        // algorithm to animate
  view?: '3d' | 'top';
}

export default function CubeCanvas({ setupAlg = '', alg = '', view = '3d' }: CubeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamically import the cubing custom element on the client
  useEffect(() => {
    import('cubing/twisty').catch(() => {
      console.warn('cubing/twisty failed to load — cube preview unavailable');
    });
  }, []);

  return (
    <div ref={containerRef} className="relative w-full aspect-square bg-zinc-900 rounded-xl overflow-hidden flex items-center justify-center">
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
