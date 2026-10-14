/**
 * VoxygenRubik2D.tsx — 2D Rubik's Cube Stereographic Projection & Rail Visualizer.
 *
 * Implements the mathematical 2D projection model by Voxygen (voxygen.dev/posts/2D_rubiks):
 * - Stereographic projection of the 6 cube faces from the (1,1,1) corner.
 * - 9 closed looping rails (Bézier curves) connecting the faces along the 3 axes.
 * - 54 stickers: 6 center square facelets + 48 circular perimeter facelets.
 * - Stickers slide smoothly along the tracks when a face/layer turns.
 * - Clickable face centers and interactive rotation buttons.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

import { solvedStickers, rotate90, railTurns, isInTurn, applyRailTurn, RAIL_PITCH as T } from '../utils/railMoves';
import type { RailTurn } from '../utils/railMoves';

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const near3 = (p: number[], q: number[]) => near(p[0], q[0]) && near(p[1], q[1]) && near(p[2], q[2]);

// Perimeter slots of a face in local order; a +90° turn = +2 slots.
const SLOT8: [number, number][] = [
  [T, 0], [T, T], [0, T], [-T, T],
  [-T, 0], [-T, -T], [0, -T], [T, -T]
];

interface Sticker {
  p: number[];
  color: string;
}

interface FaceTransform {
  A: { x: number; y: number };
  B: { x: number; y: number };
  mirror: boolean;
}

interface RailCurve {
  a: number;
  c: number;
  slots: number[][];
  path: {
    pts: [number, number][];
    cum: number[];
    total: number;
    slotS: number[];
  };
}

interface MovePlan {
  st: Sticker;
  kind: 'face' | 'ring';
  i0?: number;
  di?: number;
  faceSign?: number;
  curve?: RailCurve;
  s0?: number;
  delta?: number;
}

interface ActiveAnim extends RailTurn {
  record: boolean;
  set: Sticker[];
  plans: MovePlan[];
  start: number;
}

// Stereographic projection of the cube surface from its (1,1,1) corner
function projectSeed(p: number[]): [number, number] {
  const N = 1 / Math.sqrt(3);
  const l = Math.hypot(p[0], p[1], p[2]) || 1;
  const px = p[0] / l, py = p[1] / l, pz = p[2] / l;
  const d = (px + py + pz) * N;
  const t = 1 / Math.max(1e-6, 1 - d);
  const qx = (px - d * N) * t, qy = (py - d * N) * t, qz = (pz - d * N) * t;
  return [-(qx - qy) / Math.SQRT2, -(qx + qy - 2 * qz) / Math.sqrt(6)];
}

function fitFace(a: number, s: number) {
  const c1 = (a + 1) % 3, c2 = (a + 2) % 3;
  const W: { x: number; y: number }[] = [];
  const Z: { x: number; y: number }[] = [];

  for (const u of [-T, 0, T]) {
    for (const v of [-T, 0, T]) {
      const p = [0, 0, 0];
      p[a] = s; p[c1] = u; p[c2] = v;
      W.push({ x: u, y: v });
      const [X, Y] = projectSeed(p);
      Z.push({ x: X, y: Y });
    }
  }

  function solve(mirror: boolean) {
    const w = W.map(t => ({ x: t.x, y: mirror ? -t.y : t.y }));
    const n = w.length;
    const wm = { x: 0, y: 0 }, zm = { x: 0, y: 0 };
    for (let i = 0; i < n; i++) {
      wm.x += w[i].x / n; wm.y += w[i].y / n;
      zm.x += Z[i].x / n; zm.y += Z[i].y / n;
    }
    let nx = 0, ny = 0, den = 0;
    for (let i = 0; i < n; i++) {
      const dw = { x: w[i].x - wm.x, y: w[i].y - wm.y };
      const dz = { x: Z[i].x - zm.x, y: Z[i].y - zm.y };
      nx += dz.x * dw.x + dz.y * dw.y;
      ny += dz.y * dw.x - dz.x * dw.y;
      den += dw.x * dw.x + dw.y * dw.y;
    }
    const A = { x: nx / den, y: ny / den };
    const B = { x: zm.x - (A.x * wm.x - A.y * wm.y), y: zm.y - (A.x * wm.y + A.y * wm.x) };
    let err = 0;
    for (let i = 0; i < n; i++) {
      const ex = A.x * w[i].x - A.y * w[i].y + B.x - Z[i].x;
      const ey = A.x * w[i].y + A.y * w[i].x + B.y - Z[i].y;
      err += ex * ex + ey * ey;
    }
    return { A, B, err };
  }

  const plain = solve(false), flip = solve(true);
  const best = plain.err <= flip.err ? plain : flip;
  return { A: best.A, B: best.B, mirror: best !== plain };
}

function bezier(p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number], t: number): [number, number] {
  const m = 1 - t;
  return [
    m*m*m*p0[0] + 3*m*m*t*p1[0] + 3*m*t*t*p2[0] + t*t*t*p3[0],
    m*m*m*p0[1] + 3*m*m*t*p1[1] + 3*m*t*t*p2[1] + t*t*t*p3[1],
  ];
}

function norm2(v: [number, number]): [number, number] {
  const l = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / l, v[1] / l];
}

function ease(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
}

function isCenter(st: Sticker): boolean {
  return st.p.filter(c => c === 0).length === 2;
}

export interface VoxygenRubik2DProps {
  moveHistory: string[];
  interactive?: boolean;
  onMoveExecuted?: (move: string) => void;
  className?: string;
}

export const VoxygenRubik2D: React.FC<VoxygenRubik2DProps> = ({
  moveHistory,
  interactive = false,
  onMoveExecuted,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [selectedFaceName, setSelectedFaceName] = useState<string>('U');

  // Internal persistent mutable state
  const stateRef = useRef<{
    stickers: Sticker[];
    faces: FaceTransform[][];
    curves: RailCurve[];
    wireLayer: HTMLCanvasElement | null;
    cw: number;
    ch: number;
    cx: number;
    cy: number;
    PITCH: number;
    DOT: number;
    dpr: number;
    selected: { axis: number; sign: number } | null;
    anim: ActiveAnim | null;
    queue: RailTurn[];
    rafId: number;
  }>({
    stickers: solvedStickers(),
    faces: [[null as unknown as FaceTransform, null as unknown as FaceTransform],
            [null as unknown as FaceTransform, null as unknown as FaceTransform],
            [null as unknown as FaceTransform, null as unknown as FaceTransform]],
    curves: [],
    wireLayer: null,
    cw: 300,
    ch: 300,
    cx: 150,
    cy: 150,
    PITCH: 30,
    DOT: 8,
    dpr: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
    selected: { axis: 1, sign: 1 }, // Default to Up face
    anim: null,
    queue: [],
    rafId: 0,
  });

  const getFaceName = (axis: number, sign: number): string => {
    if (axis === 0) return sign > 0 ? 'R' : 'L';
    if (axis === 1) return sign > 0 ? 'U' : 'D';
    return sign > 0 ? 'F' : 'B';
  };

  const faceOf = useCallback((a: number, s: number): FaceTransform => {
    return stateRef.current.faces[a][s > 0 ? 0 : 1];
  }, []);

  const facePoint = useCallback((a: number, s: number, u: number, v: number): [number, number] => {
    const f = faceOf(a, s);
    const wx = u, wy = f.mirror ? -v : v;
    return [f.A.x * wx - f.A.y * wy + f.B.x, f.A.x * wy + f.A.y * wx + f.B.y];
  }, [faceOf]);

  const L = useCallback((p: number[]): [number, number] => {
    for (let a = 0; a < 3; a++) {
      if (p[a] === 1 || p[a] === -1) {
        return facePoint(a, p[a], p[(a + 1) % 3], p[(a + 2) % 3]);
      }
    }
    return [0, 0];
  }, [facePoint]);

  const faceLocal = (f: FaceTransform, x: number, y: number): [number, number] => {
    const dx = x - f.B.x, dy = y - f.B.y;
    const a2 = f.A.x * f.A.x + f.A.y * f.A.y;
    const wx = (dx * f.A.x + dy * f.A.y) / a2;
    const wy = (dy * f.A.x - dx * f.A.y) / a2;
    return [wx, f.mirror ? -wy : wy];
  };

  const buildCurves = useCallback(() => {
    const state = stateRef.current;
    state.curves = [];
    for (let a = 0; a < 3; a++) {
      const b = (a + 1) % 3, d = (a + 2) % 3;
      for (const c of [-T, 0, T]) {
        let triple = [-T, 0, T].map(t => {
          const p = [0, 0, 0];
          p[a] = c; p[b] = 1; p[d] = t;
          return p;
        });
        const slots: number[][] = [];
        for (let k = 0; k < 4; k++) {
          slots.push(...triple);
          triple = triple.map(p => rotate90(p, a, 1));
        }
        const scr = slots.map(L);
        const pts: [number, number][] = [], slotIdx: number[] = [];
        for (let k = 0; k < 4; k++) {
          for (let j = 0; j < 3; j++) {
            pts.push(scr[3 * k + j]);
            slotIdx[3 * k + j] = pts.length - 1;
          }
          const P1 = scr[3 * k + 1], P2 = scr[3 * k + 2];
          const kn = (k + 1) % 4;
          const Q0 = scr[3 * kn], Q1 = scr[3 * kn + 1];
          const D = Math.hypot(Q0[0] - P2[0], Q0[1] - P2[1]);
          const t1 = norm2([P2[0] - P1[0], P2[1] - P1[1]]);
          const t2 = norm2([Q0[0] - Q1[0], Q0[1] - Q1[1]]);
          const kk = 0.4 * D;
          const c1p: [number, number] = [P2[0] + t1[0] * kk, P2[1] + t1[1] * kk];
          const c2p: [number, number] = [Q0[0] + t2[0] * kk, Q0[1] + t2[1] * kk];
          const SAMP = 32;
          for (let i = 1; i < SAMP; i++) pts.push(bezier(P2, c1p, c2p, Q0, i / SAMP));
        }
        pts.push(scr[0]);
        const cum = [0];
        for (let i = 1; i < pts.length; i++) {
          cum[i] = cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        }
        const total = cum[cum.length - 1];
        state.curves.push({ a, c, slots, path: { pts, cum, total, slotS: slotIdx.map(i => cum[i]) } });
      }
    }
  }, [L]);

  const buildFaces = useCallback(() => {
    const s = stateRef.current;
    const min = Math.min(s.cw, s.ch);
    s.PITCH = 0.082 * min;
    s.DOT = Math.max(5, s.PITCH * 0.28);
    const D1 = 0.14 * min, D2 = 0.38 * min;
    const AMAG = s.PITCH / T;
    const fits: { a: number; s: number; fit: ReturnType<typeof fitFace> }[] = [];
    for (let a = 0; a < 3; a++) {
      for (const sgn of [1, -1]) fits.push({ a, s: sgn, fit: fitFace(a, sgn) });
    }
    const dists = fits.map(f => Math.hypot(f.fit.B.x, f.fit.B.y)).sort((x, y) => x - y);
    const cut = (dists[2] + dists[3]) / 2;
    for (const f of fits) {
      const { A, B, mirror } = f.fit;
      const bl = Math.hypot(B.x, B.y), al = Math.hypot(A.x, A.y);
      const D = bl < cut ? D1 : D2;
      s.faces[f.a][f.s > 0 ? 0 : 1] = {
        A: { x: A.x / al * AMAG, y: A.y / al * AMAG },
        B: { x: s.cx + B.x / bl * D, y: s.cy + B.y / bl * D },
        mirror,
      };
    }
    buildCurves();
    // Fit the complete rails and sticker radii, including the outermost face.
    const points = [...s.curves.flatMap(c => c.path.pts), ...solvedStickers().map(st => L(st.p))];
    const minX = Math.min(...points.map(p => p[0])), maxX = Math.max(...points.map(p => p[0]));
    const minY = Math.min(...points.map(p => p[1])), maxY = Math.max(...points.map(p => p[1]));
    const margin = s.DOT + 18;
    const scale = Math.min(1, (s.cw - margin * 2) / (maxX - minX), (s.ch - margin * 2) / (maxY - minY));
    const midX = (minX + maxX) / 2, midY = (minY + maxY) / 2;
    for (const axis of s.faces) for (const f of axis) {
      f.A.x *= scale; f.A.y *= scale;
      f.B.x = s.cx + (f.B.x - midX) * scale;
      f.B.y = s.cy + (f.B.y - midY) * scale;
    }
    s.PITCH *= scale;
    s.DOT *= scale;
    buildCurves();
  }, [buildCurves, L]);

  const renderWires = useCallback(() => {
    const s = stateRef.current;
    s.wireLayer = document.createElement('canvas');
    s.wireLayer.width = s.cw * s.dpr;
    s.wireLayer.height = s.ch * s.dpr;
    const g = s.wireLayer.getContext('2d');
    if (!g) return;

    g.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);

    // Faint tinted plates behind each face's square
    for (let a = 0; a < 3; a++) {
      for (const sgn of [1, -1]) {
        const f = faceOf(a, sgn);
        const half = s.PITCH + s.DOT + 4;
        g.save();
        g.translate(f.B.x, f.B.y);
        g.rotate(Math.atan2(f.A.y, f.A.x));
        g.fillStyle = 'rgba(255, 255, 255, 0.04)';
        g.beginPath();
        g.rect(-half, -half, half * 2, half * 2);
        g.fill();
        g.restore();
      }
    }

    // 9 Closed rail tracks
    g.strokeStyle = '#818CF8'; // Indigo accent
    g.lineWidth = 1.6;
    g.globalAlpha = 0.6;
    for (const c of s.curves) {
      g.beginPath();
      const pts = c.path.pts;
      g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.stroke();
    }
  }, [faceOf]);

  const pathPoint = (path: RailCurve['path'], s: number): [number, number] => {
    let m = s % path.total;
    if (m < 0) m += path.total;
    let lo = 0, hi = path.cum.length - 1;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >> 1;
      if (path.cum[mid] <= m) lo = mid; else hi = mid;
    }
    const seg = path.cum[hi] - path.cum[lo] || 1;
    const f = (m - path.cum[lo]) / seg;
    const p = path.pts[lo], q = path.pts[hi];
    return [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f];
  };

  const curveFor = useCallback((a: number, c: number): RailCurve | undefined => {
    return stateRef.current.curves.find(cv2 => cv2.a === a && near(cv2.c, c));
  }, []);

  const movingSet = (axis: number, sign: number): Sticker[] => {
    return stateRef.current.stickers.filter(st => sign * st.p[axis] > 0.34);
  };

  const centerOf = (axis: number, sign: number): Sticker | undefined => {
    return stateRef.current.stickers.find(st => isCenter(st) && st.p[axis] === sign);
  };

  const startNext = useCallback((now: number) => {
    const s = stateRef.current;
    const m = s.queue.shift();
    if (!m) return;
    const set = s.stickers.filter(st => isInTurn(st, m));
    const plans: MovePlan[] = [];

    for (const st of set) {
      if (Math.abs(st.p[m.axis]) === 1) {
        const u = st.p[(m.axis + 1) % 3], v = st.p[(m.axis + 2) % 3];
        if (u === 0 && v === 0) continue;
        const i0 = SLOT8.findIndex(q => near(q[0], u) && near(q[1], v));
        plans.push({ st, kind: 'face', i0, di: 2 * m.dir, faceSign: st.p[m.axis] });
      } else {
        const curve = curveFor(m.axis, st.p[m.axis]);
        if (!curve) continue;
        const i0 = curve.slots.findIndex(q => near3(q, st.p));
        const j = (i0 + 3 * m.dir + 12) % 12;
        let delta = curve.path.slotS[j] - curve.path.slotS[i0];
        if (m.dir > 0 && delta < 0) delta += curve.path.total;
        if (m.dir < 0 && delta > 0) delta -= curve.path.total;
        plans.push({ st, kind: 'ring', curve, s0: curve.path.slotS[i0], delta });
      }
    }
    s.anim = { ...m, set, plans, start: now, record: false };
  }, [curveFor]);

  const commit = (m: ActiveAnim) => {
    for (const st of m.set) st.p = rotate90(st.p, m.axis, m.dir);
  };

  const consumedHistory = useRef<string[]>([]);
  // Rebuild on mount/reset, append every event (including repeated identical turns).
  useEffect(() => {
    const s = stateRef.current;
    const previous = consumedHistory.current;
    const extendsHistory = previous.length <= moveHistory.length && previous.every((m, i) => m === moveHistory[i]);
    if (!extendsHistory || previous.length === 0) {
      s.stickers = solvedStickers();
      s.anim = null;
      s.queue = [];
      for (const move of moveHistory) for (const turn of railTurns(move)) applyRailTurn(s.stickers, turn);
    } else {
      s.queue.push(...moveHistory.slice(previous.length).flatMap(railTurns));
      // Keep fast input responsive instead of accumulating seconds of animation.
      if (s.queue.length > 6) {
        if (s.anim) applyRailTurn(s.stickers, s.anim);
        for (const turn of s.queue) applyRailTurn(s.stickers, turn);
        s.anim = null;
        s.queue = [];
      }
    }
    consumedHistory.current = [...moveHistory];
  }, [moveHistory]);

  // Main Draw Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const state = stateRef.current;

    const draw = (now: number) => {
      if (!running) return;
      const s = stateRef.current;

      if (!s.anim && s.queue.length) {
        startNext(now);
      }

      const animPos = new Map<Sticker, [number, number]>();
      let animEase = 0;
      if (s.anim) {
        let t = (now - s.anim.start) / s.anim.dur;
        if (t >= 1) {
          commit(s.anim);
          s.anim = null;
          if (s.queue.length) startNext(now);
        }
        if (s.anim) {
          t = Math.max(0, Math.min(1, (now - s.anim.start) / s.anim.dur));
          animEase = ease(t);

          for (const pl of s.anim.plans) {
            if (pl.kind === 'ring' && pl.curve && pl.s0 !== undefined && pl.delta !== undefined) {
              animPos.set(pl.st, pathPoint(pl.curve.path, pl.s0 + pl.delta * animEase));
            } else if (pl.i0 !== undefined && pl.di !== undefined) {
              let pos = pl.i0 + pl.di * animEase;
              pos = ((pos % 8) + 8) % 8;
              const i = Math.floor(pos) % 8, f = pos - Math.floor(pos);
              const p0 = SLOT8[i], p1 = SLOT8[(i + 1) % 8];
              const u = p0[0] + (p1[0] - p0[0]) * f, v = p0[1] + (p1[1] - p0[1]) * f;
              animPos.set(pl.st, facePoint(s.anim.axis, pl.faceSign ?? 1, u, v));
            }
          }
        }
      }

      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, s.cw, s.ch);

      // Draw cached wire layer
      if (s.wireLayer) {
        ctx.drawImage(s.wireLayer, 0, 0, s.cw, s.ch);
      }

      const selSet = s.selected ? new Set(movingSet(s.selected.axis, s.selected.sign)) : null;
      const selCenter = s.selected ? centerOf(s.selected.axis, s.selected.sign) : null;

      // Draw all 54 stickers
      const ordered = s.stickers.slice().sort((s1, s2) => (isCenter(s1) ? 1 : 0) - (isCenter(s2) ? 1 : 0));
      for (const st of ordered) {
        const [x, y] = animPos.get(st) || L(st.p);

        if (isCenter(st)) {
          // Center square sticker
          const a = st.p.findIndex(c => c !== 0);
          const f = faceOf(a, st.p[a]);
          let ang = Math.atan2(f.A.y, f.A.x);
          if (s.anim && a === s.anim.axis && isInTurn(st, s.anim)) {
            ang += (f.mirror ? -1 : 1) * s.anim.dir * (Math.PI / 2) * animEase;
          }

          const half = s.DOT * 1.15;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(ang);
          ctx.beginPath();
          ctx.rect(-half, -half, half * 2, half * 2);
          ctx.fillStyle = st.color;
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#09090B';
          ctx.stroke();

          // Selection dashed frame
          if (st === selCenter) {
            ctx.beginPath();
            ctx.rect(-half - 4, -half - 4, (half + 4) * 2, (half + 4) * 2);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#F59E0B';
            ctx.setLineDash([4, 2]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          ctx.restore();
          continue;
        }

        // Perimeter circular sticker
        ctx.beginPath();
        ctx.arc(x, y, s.DOT, 0, Math.PI * 2);
        ctx.fillStyle = st.color;
        ctx.fill();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = '#09090B';
        ctx.stroke();

        if (selSet && selSet.has(st)) {
          ctx.beginPath();
          ctx.arc(x, y, s.DOT + 2, 0, Math.PI * 2);
          ctx.lineWidth = 1.8;
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
          ctx.stroke();
        }
      }

      s.rafId = requestAnimationFrame(draw);
    };

    stateRef.current.rafId = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(state.rafId);
    };
  }, [L, facePoint, faceOf, startNext]);

  // Handle Container Resizing
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const s = stateRef.current;
      s.cw = rect.width;
      s.ch = rect.height;
      s.cx = rect.width / 2;
      s.cy = rect.height / 2;
      s.dpr = window.devicePixelRatio || 1;

      canvas.width = s.cw * s.dpr;
      canvas.height = s.ch * s.dpr;

      buildFaces();
      renderWires();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [buildFaces, renderWires]);

  // Click on canvas to select face
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const s = stateRef.current;
    const pad = s.DOT / (s.PITCH / T);
    let best: { axis: number; sign: number } | null = null;
    let bestM = Infinity;

    for (let a = 0; a < 3; a++) {
      for (const sgn of [1, -1]) {
        const [u, v] = faceLocal(faceOf(a, sgn), mx, my);
        const m = Math.max(Math.abs(u), Math.abs(v));
        if (m <= T + pad && m < bestM) {
          bestM = m;
          best = { axis: a, sign: sgn };
        }
      }
    }

    if (best) {
      stateRef.current.selected = best;
      setSelectedFaceName(getFaceName(best.axis, best.sign));
    }
  };

  // Turn Selected Face
  const handleRotateSelected = (cwWanted: boolean) => {
    const s = stateRef.current;
    if (!s.selected) return;

    const faceName = getFaceName(s.selected.axis, s.selected.sign);
    const moveStr = cwWanted ? faceName : `${faceName}'`;
    if (onMoveExecuted) onMoveExecuted(moveStr);
  };

  return (
    <div
      data-testid="voxygen-view"
      data-move-count={moveHistory.length}
      ref={containerRef}
      className={`relative w-full h-full min-h-[220px] bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 shadow-xl select-none ${className}`}
    >
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        aria-label="Voxygen-style six-face cube projection with nine rails"
        className="w-full h-full block cursor-pointer"
      />

      {/* Top pill: Active Face Indicator */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900/90 border border-zinc-700/80 rounded-lg text-xs font-mono">
        <span className="text-zinc-400">Selected Face:</span>
        <span className="font-bold text-amber-400">{selectedFaceName}</span>
      </div>

      {/* Rotation buttons in bottom corners */}
      <div className="absolute inset-x-2 bottom-2 z-10 flex justify-between pointer-events-none">
        <button
          onClick={() => handleRotateSelected(false)}
          disabled={!interactive}
          aria-label={`Rotate ${selectedFaceName}' (Counter-Clockwise)`}
          className="pointer-events-auto disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center w-9 h-9 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white shadow-lg active:scale-95 transition-all text-xs font-bold font-mono"
        >
          ↺
        </button>

        <button
          onClick={() => handleRotateSelected(true)}
          disabled={!interactive}
          aria-label={`Rotate ${selectedFaceName} (Clockwise)`}
          className="pointer-events-auto disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center w-9 h-9 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white shadow-lg active:scale-95 transition-all text-xs font-bold font-mono"
        >
          ↻
        </button>
      </div>
    </div>
  );
};

export default VoxygenRubik2D;
