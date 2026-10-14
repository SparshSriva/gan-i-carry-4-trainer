/**
 * Twisty3DView.tsx — Robust React wrapper for cubing.js TwistyPlayer.
 *
 * Avoids React JSX custom-element property collisions (such as `get alg()` exceptions)
 * and React 18 StrictMode lifecycle disruptions by managing the WebGL player
 * instance imperatively through an HTML container ref.
 */

import React, { useEffect, useRef, useState } from 'react';
import { TwistyPlayer } from 'cubing/twisty';
import type { CubeOrientation } from '../utils/cubeOrientation';

export interface Twisty3DViewProps {
  setupAlg?: string;
  alg?: string;
  visualization?: 'PG3D' | 'experimental-2D-LL' | '2D';
  className?: string;
  orientation?: CubeOrientation;
  onOrbitChange?: (yaw: number, pitch: number) => void;
}

export const Twisty3DView: React.FC<Twisty3DViewProps> = ({
  setupAlg = '',
  alg = '',
  visualization = 'PG3D',
  className = '',
  orientation,
  onOrbitChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<TwistyPlayer | null>(null);

  const poseRef = useRef(orientation);
  poseRef.current = orientation;
  const onOrbitRef = useRef(onOrbitChange);
  onOrbitRef.current = onOrbitChange;

  const dragRef = useRef<{ x: number; y: number; pose: CubeOrientation } | null>(null);
  const [dragging, setDragging] = useState(false);
  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !poseRef.current) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, pose: { ...poseRef.current } };
    setDragging(true);
  };
  const drag = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = dragRef.current;
    if (!start) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    const roll = start.pose.roll * Math.PI / 180;
    onOrbitRef.current?.(start.pose.yaw - (dx * Math.cos(roll) + dy * Math.sin(roll)) * 0.5,
      start.pose.pitch + (dy * Math.cos(roll) - dx * Math.sin(roll)) * 0.5);
  };
  const endDrag = () => { dragRef.current = null; setDragging(false); };

  // Mount TwistyPlayer instance once per visualization mode
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let player: TwistyPlayer;
    let detachOrbit: (() => void) | undefined;
    try {
      player = new TwistyPlayer({
        puzzle: '3x3x3',
        visualization,
        hintFacelets: 'none',
        backView: 'none',
        controlPanel: 'none',
        background: 'none',
        experimentalDragInput: 'none',
        experimentalMovePressInput: 'none',
        cameraLatitudeLimit: 89,
      });

      player.style.width = '100%';
      player.style.height = '100%';
      // The player's size-contained shadow wrapper relies on its host grid.
      player.style.display = 'grid';

      if (visualization === 'PG3D' && poseRef.current) {
        player.cameraLatitude = poseRef.current.pitch;
        player.cameraLongitude = poseRef.current.yaw;
        const coordinates = player.experimentalModel.twistySceneModel.orbitCoordinates;
        const listener = (orbit: { longitude: number; latitude: number }) => onOrbitRef.current?.(orbit.longitude, orbit.latitude);
        coordinates.addFreshListener(listener);
        detachOrbit = () => coordinates.removeFreshListener(listener);
      }
      container.replaceChildren(player);
      playerRef.current = player;

    } catch (err) {
      console.error('Error instantiating TwistyPlayer:', err);
    }

      return () => {
      detachOrbit?.();
      container.replaceChildren();
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
      player.timestamp = 'end';
    } catch (err) {
      console.warn('Could not update TwistyPlayer algorithm:', err);
    }
  }, [setupAlg, alg, visualization]);

  const pitch = orientation?.pitch;
  const yaw = orientation?.yaw;
  useEffect(() => {
    if (visualization !== 'PG3D' || pitch === undefined || yaw === undefined || !playerRef.current) return;
    playerRef.current.cameraLatitude = pitch;
    playerRef.current.cameraLongitude = yaw;
  }, [pitch, yaw, visualization]);

  return (
    <div className={`relative w-full h-full min-h-[180px] overflow-hidden ${className}`}>
      <div ref={containerRef} style={visualization === 'PG3D' ? { transform: `rotate(${orientation?.roll ?? 0}deg)` } : undefined}
        className="relative w-full h-full flex items-center justify-center" />
      {visualization === 'PG3D' && orientation && <div
        role="group" aria-label="Rotate 3D cube view" tabIndex={0}
        className={`absolute inset-0 touch-none outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onPointerDown={startDrag} onPointerMove={drag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}
        onKeyDown={e => {
          const delta: Record<string, [number, number]> = { ArrowLeft: [5, 0], ArrowRight: [-5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] };
          if (delta[e.key]) {
            e.preventDefault(); e.stopPropagation();
            onOrbitRef.current?.(orientation.yaw + delta[e.key][0], orientation.pitch + delta[e.key][1]);
          }
        }} />}
    </div>
  );
};

export default Twisty3DView;
