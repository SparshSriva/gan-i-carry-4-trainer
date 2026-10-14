/**
 * Twisty3DView.tsx — Robust React wrapper for cubing.js TwistyPlayer.
 *
 * Avoids React JSX custom-element property collisions (such as `get alg()` exceptions)
 * and React 18 StrictMode lifecycle disruptions by managing the WebGL player
 * instance imperatively through an HTML container ref.
 */

import React, { useEffect, useRef } from 'react';
import { TwistyPlayer } from 'cubing/twisty';

export interface Twisty3DViewProps {
  setupAlg?: string;
  alg?: string;
  visualization?: 'PG3D' | 'experimental-2D-LL' | '2D';
  className?: string;
}

export const Twisty3DView: React.FC<Twisty3DViewProps> = ({
  setupAlg = '',
  alg = '',
  visualization = 'PG3D',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<TwistyPlayer | null>(null);

  // Mount TwistyPlayer instance once per visualization mode
  useEffect(() => {
    if (!containerRef.current) return;

    let player: TwistyPlayer;
    try {
      player = new TwistyPlayer({
        puzzle: '3x3x3',
        visualization,
        hintFacelets: 'none',
        backView: 'none',
        controlPanel: 'none',
        background: 'none',
      });

      player.style.width = '100%';
      player.style.height = '100%';
      player.style.display = 'block';

      if (setupAlg) {
        player.experimentalSetupAlg = setupAlg;
      }
      if (alg) {
        player.alg = alg;
      }

      const container = containerRef.current;
      container.replaceChildren(player);
      playerRef.current = player;
    } catch (err) {
      console.error('Error instantiating TwistyPlayer:', err);
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.replaceChildren();
      }
      playerRef.current = null;
    };
  }, [visualization]);

  // Propagate setupAlg and alg changes to the player without unmounting the WebGL canvas
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    try {
      player.experimentalSetupAlg = setupAlg || '';
      player.alg = alg || '';
    } catch (err) {
      console.warn('Could not update TwistyPlayer algorithm:', err);
    }
  }, [setupAlg, alg]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[180px] flex items-center justify-center overflow-hidden ${className}`}
    />
  );
};

export default Twisty3DView;
