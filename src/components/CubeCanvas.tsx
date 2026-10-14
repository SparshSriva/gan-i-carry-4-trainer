import React, { useCallback, useEffect, useState } from 'react';
import { loadOrientation, saveOrientation, normalizeOrientation, DEFAULT_CUBE_ORIENTATION } from '../utils/cubeOrientation';
import type { CubeOrientation } from '../utils/cubeOrientation';
import Twisty3DView from './Twisty3DView';
import VoxygenRubik2D from './VoxygenRubik2D';

export type ViewMode = 'split' | '3d' | '2d' | 'net' | 'll';
interface CubeCanvasProps {
  moveHistory: string[];
  view?: ViewMode;
  interactive?: boolean;
  onLayerClick?: (move: string) => void;
}

export const CubeCanvas: React.FC<CubeCanvasProps> = ({ moveHistory, view = 'split', interactive = false, onLayerClick }) => {
  const [orientation, setOrientation] = useState(loadOrientation);
  useEffect(() => saveOrientation(orientation), [orientation]);
  const changeOrientation = useCallback((patch: Partial<CubeOrientation>) => {
    setOrientation(prev => {
      const next = normalizeOrientation({ ...prev, ...patch });
      return next.yaw === prev.yaw && next.pitch === prev.pitch && next.roll === prev.roll ? prev : next;
    });
  }, []);
  const onOrbitChange = useCallback((yaw: number, pitch: number) => changeOrientation({ yaw, pitch }), [changeOrientation]);
  const poseProps = { orientation, onOrbitChange };
  const controls = <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 space-y-3">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold">Solving view</p><p className="text-[11px] text-zinc-400 mt-1">Drag the 3D cube to turn your view. Adjust roll to match your grip.</p></div><button onClick={() => setOrientation({ ...DEFAULT_CUBE_ORIENTATION })} className="text-xs text-indigo-300 whitespace-nowrap">Reset view</button></div>
    <div className="grid grid-cols-3 gap-3">{([['yaw', 'Turn', -180, 180], ['pitch', 'Tilt', -89, 89], ['roll', 'Roll', -180, 180]] as const).map(([axis, label, min, max]) => <label key={axis} className="text-[11px] text-zinc-400"><span className="flex justify-between gap-1">{label}<output>{orientation[axis].toFixed(0)}°</output></span><input aria-label={`View ${label.toLowerCase()}`} type="range" min={min} max={max} step="1" value={orientation[axis]} onChange={e => changeOrientation({ [axis]: Number(e.target.value) })} className="w-full accent-indigo-500 mt-2" /></label>)}</div>
    <p className="text-[11px] text-zinc-500">View alignment is saved. Move notation still uses the cube’s logical face labels.</p>
  </div>;
  const alg = moveHistory.join(' ');
  const rails = <VoxygenRubik2D moveHistory={moveHistory} interactive={interactive} onMoveExecuted={onLayerClick} />;
  if (view === 'split') return <><div className="w-full aspect-square rounded-2xl grid grid-cols-2 gap-2 p-2 border border-zinc-800 bg-zinc-900 overflow-hidden">
    <div className="relative overflow-hidden rounded-xl bg-zinc-950"><span className="absolute top-2 left-2 z-10 text-[10px] text-zinc-400">3D Puzzle</span><Twisty3DView alg={alg} {...poseProps} /></div>
    <div className="relative overflow-hidden rounded-xl">{rails}</div>
  </div>{controls}</>;
  return <><div className="w-full aspect-square rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900">
    {view === '2d' ? rails : <Twisty3DView alg={alg} {...poseProps} visualization={view === 'net' ? '2D' : view === 'll' ? 'experimental-2D-LL' : 'PG3D'} />}
  </div>{view === '3d' && controls}</>;
};
export default CubeCanvas;
