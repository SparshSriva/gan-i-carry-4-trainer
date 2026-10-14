import { gripRotation, snapGrip, gripMap, FACE_LABELS, DEFAULT_GRIP } from '../utils/gripOrientation';
import type { GripOrientation, GripFace } from '../utils/gripOrientation';
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
  grip?: GripOrientation;
  onGripChange?: (g:GripOrientation)=>void;
  gripLocked?: boolean;
  onLayerClick?: (move: string) => void;
}

export const CubeCanvas: React.FC<CubeCanvasProps> = ({ moveHistory, view = 'split', interactive = false, onLayerClick, grip = DEFAULT_GRIP, onGripChange, gripLocked = false }) => {
  const [orientation, setOrientation] = useState(loadOrientation);
  useEffect(() => saveOrientation(orientation), [orientation]);
  const changeOrientation = useCallback((patch: Partial<CubeOrientation>) => {
    setOrientation(prev => {
      const next = normalizeOrientation({ ...prev, ...patch });
      return next.yaw === prev.yaw && next.pitch === prev.pitch && next.roll === prev.roll ? prev : next;
    });
  }, []);
  const onOrbitChange = useCallback((yaw: number, pitch: number) => changeOrientation({ yaw, pitch }), [changeOrientation]);
  const [snapEnabled,setSnapEnabled]=useState(true);
  const applyGrip=(g:GripOrientation)=>{if(gripLocked)return;onGripChange?.(g);setOrientation({...DEFAULT_CUBE_ORIENTATION});};
  const onSnap=(pose:CubeOrientation)=>{if(snapEnabled && !gripLocked)applyGrip(snapGrip(normalizeOrientation(pose),grip));};
  const poseProps = { orientation, onOrbitChange, onSnap };
  const faces=Object.keys(FACE_LABELS) as GripFace[];
  const mapping=gripMap(grip);
  const controls = <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 space-y-3">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold">Solving view</p><p className="text-[11px] text-zinc-400 mt-1">Drag and release to snap to a solving orientation. Use up/front to set your grip exactly.</p></div><button onClick={() => setOrientation({ ...DEFAULT_CUBE_ORIENTATION })} className="text-xs text-indigo-300 whitespace-nowrap">Reset view</button></div>
    <div className="grid grid-cols-2 gap-3">{(['up','front'] as const).map(axis=><label key={axis} className="text-xs text-zinc-400">{axis==='up'?'Up face':'Front face'}<select aria-label={`Solving ${axis} face`} disabled={gripLocked} value={grip[axis]} onChange={e=>{const face=e.target.value as GripFace;if(axis==='front')applyGrip({...grip,front:face});else{const candidate={...grip,up:face};if(face===grip.front || mapping.B===face)candidate.front=faces.find(f=>f!==face && f!==({U:'D',D:'U',R:'L',L:'R',F:'B',B:'F'} as const)[face])!;applyGrip(candidate);}}} className="block mt-1 bg-zinc-800 rounded p-2 w-full disabled:opacity-50">{faces.filter(f=>axis==='up' || (f!==grip.up && f!==mapping.D)).map(f=><option key={f} value={f}>{FACE_LABELS[f]} ({f})</option>)}</select></label>)}</div>
    <label className="flex gap-2 text-xs text-zinc-400"><input type="checkbox" checked={snapEnabled} disabled={gripLocked} onChange={e=>setSnapEnabled(e.target.checked)}/>Snap solving orientation on release</label>
    <button disabled={gripLocked} onClick={()=>applyGrip(snapGrip(orientation,grip))} className="text-xs text-indigo-300 disabled:opacity-40">Snap current angle</button>
    <div className="grid grid-cols-3 gap-3">{([['yaw', 'Turn', -180, 180], ['pitch', 'Tilt', -89, 89], ['roll', 'Roll', -180, 180]] as const).map(([axis, label, min, max]) => <label key={axis} className="text-[11px] text-zinc-400"><span className="flex justify-between gap-1">{label}<output>{orientation[axis].toFixed(0)}°</output></span><input aria-label={`View ${label.toLowerCase()}`} type="range" min={min} max={max} step="1" value={orientation[axis]} onChange={e => changeOrientation({ [axis]: Number(e.target.value) })} className="w-full accent-indigo-500 mt-2" /></label>)}</div>
    <p className="text-[11px] text-zinc-500">{gripLocked?'Solving frame is locked during this attempt. Dragging only changes your view.':`Notation follows your grip. GAN ${mapping.R} is your R, GAN ${mapping.U} is your U. Frame is saved.`}</p>
  </div>;
  const displayedMoves = [...gripRotation(grip),...moveHistory];
  const alg = displayedMoves.join(' ');
  const rails = <VoxygenRubik2D moveHistory={displayedMoves} interactive={interactive} onMoveExecuted={onLayerClick} />;
  if (view === 'split') return <><div className="w-full aspect-square rounded-2xl grid grid-cols-2 gap-2 p-2 border border-zinc-800 bg-zinc-900 overflow-hidden">
    <div className="relative overflow-hidden rounded-xl bg-zinc-950"><span className="absolute top-2 left-2 z-10 text-[10px] text-zinc-400">3D Puzzle</span><Twisty3DView alg={alg} {...poseProps} /></div>
    <div className="relative overflow-hidden rounded-xl">{rails}</div>
  </div>{controls}</>;
  return <><div className="w-full aspect-square rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900">
    {view === '2d' ? rails : <Twisty3DView alg={alg} {...poseProps} visualization={view === 'net' ? '2D' : view === 'll' ? 'experimental-2D-LL' : 'PG3D'} />}
  </div>{view === '3d' && controls}</>;
};
export default CubeCanvas;
