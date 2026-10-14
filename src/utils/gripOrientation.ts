import type { CubeOrientation } from './cubeOrientation';
export type GripFace = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';
export interface GripOrientation { up: GripFace; front: GripFace }
export const DEFAULT_GRIP: GripOrientation = { up: 'U', front: 'F' };
export const FACE_LABELS: Record<GripFace, string> = { U: 'White', R: 'Red', F: 'Green', D: 'Yellow', L: 'Orange', B: 'Blue' };
const vectors: Record<GripFace, number[]> = { U: [0,1,0], R: [1,0,0], F: [0,0,1], D: [0,-1,0], L: [-1,0,0], B: [0,0,-1] };
const dot = (a: number[], b: number[]) => a.reduce((n,v,i) => n+v*b[i],0);
const face = (v: number[]) => (Object.keys(vectors) as GripFace[]).find(f => dot(vectors[f],v) > 0.99)!;
export function validGrip(g: GripOrientation): boolean { return Boolean(vectors[g.up] && vectors[g.front] && dot(vectors[g.up],vectors[g.front]) === 0); }
export function gripMap(g: GripOrientation): Record<GripFace, GripFace> {
  const u = vectors[g.up], f = vectors[g.front];
  const r = [u[1]*f[2]-u[2]*f[1], u[2]*f[0]-u[0]*f[2], u[0]*f[1]-u[1]*f[0]];
  return { U:g.up, F:g.front, R:face(r), D:face(u.map(v=>-v)), B:face(f.map(v=>-v)), L:face(r.map(v=>-v)) };
}
export function physicalToGrip(move: string, grip: GripOrientation): string {
  const map = gripMap(grip);
  const local = (Object.keys(map) as GripFace[]).find(f => map[f] === move[0]);
  if (!local) throw new Error(`Unsupported sensor move: ${move}`);
  return local + move.slice(1);
}
const rotate = (v: number[], a: number) => { const p=[...v], b=(a+1)%3,c=(a+2)%3; p[b]=v[c];p[c]=-v[b];return p; };
export function gripRotation(g: GripOrientation): string[] {
  const queue = [{ u:vectors[g.up], f:vectors[g.front], moves:[] as string[] }], seen = new Set<string>();
  while (queue.length) {
    const s=queue.shift()!, key=`${s.u}|${s.f}`;
    if (seen.has(key)) continue; seen.add(key);
    if (face(s.u)==='U' && face(s.f)==='F') return s.moves;
    for (const [a,m] of [[0,'x'],[1,'y'],[2,'z']] as const) queue.push({u:rotate(s.u,a),f:rotate(s.f,a),moves:[...s.moves,m]});
  }
  throw new Error('Invalid up/front orientation');
}
export function snapGrip(pose: CubeOrientation, current: GripOrientation): GripOrientation {
  const yaw=pose.yaw*Math.PI/180,pitch=pose.pitch*Math.PI/180,roll=pose.roll*Math.PI/180;
  const forward=[Math.cos(pitch)*Math.sin(yaw),Math.sin(pitch),Math.cos(pitch)*Math.cos(yaw)];
  const up=[-Math.sin(pitch)*Math.sin(yaw),Math.cos(pitch),-Math.sin(pitch)*Math.cos(yaw)];
  const right=[Math.cos(yaw),0,-Math.sin(yaw)];
  const screenUp=up.map((v,i)=>v*Math.cos(roll)+right[i]*Math.sin(roll));
  const faces=Object.keys(vectors) as GripFace[];
  const front=[...faces].sort((a,b)=>dot(vectors[b],forward)-dot(vectors[a],forward))[0];
  const top=faces.filter(f=>dot(vectors[f],vectors[front])===0).sort((a,b)=>dot(vectors[b],screenUp)-dot(vectors[a],screenUp))[0];
  const map=gripMap(current); return {up:map[top],front:map[front]};
}
export function loadGrip(): GripOrientation { try {const g=JSON.parse(localStorage.getItem('ganicv4_grip_v1')??'null');if(g && validGrip(g))return g;}catch{/* default */}return {...DEFAULT_GRIP}; }
export function saveGrip(g: GripOrientation): void { try {localStorage.setItem('ganicv4_grip_v1',JSON.stringify(g));}catch{/* in-memory */} }
