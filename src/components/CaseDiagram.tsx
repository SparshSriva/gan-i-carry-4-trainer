import { useMemo } from 'react';
import type { AlgCase } from '../types';
import { invertAlg, parseAlg } from '../utils/moveUtils';
import { solvedStickers, railTurns, applyRailTurn } from '../utils/railMoves';
import { gripRotation } from '../utils/gripOrientation';
import type { GripFace } from '../utils/gripOrientation';

export default function CaseDiagram({ c }: {c:AlgCase}) {
  const {stickers, pair}=useMemo(()=>{
    const s=solvedStickers();
    // Track the destination cubies through setup, rather than coloring every
    // sticker that happens to share a color with the pair.
    const origins=new Map(s.map(st=>[st,[...st.p]]));
    for(const move of parseAlg(invertAlg(c.alg)))for(const turn of railTurns(move))applyRailTurn(s,turn);
    const face=(p:number[]):GripFace=>p[0]===1?'R':p[0]===-1?'L':p[1]===1?'U':p[1]===-1?'D':p[2]===1?'F':'B';
    const white=s.find(st=>st.color==='#FFFFFF' && st.p.filter(v=>v===0).length===2)!;
    const green=s.find(st=>st.color==='#16A34A' && st.p.filter(v=>v===0).length===2)!;
    for(const move of gripRotation({up:face(white.p),front:face(green.p)}))for(const turn of railTurns(move))applyRailTurn(s,turn);
    let slot=[1,1];
    if(c.subset==='F2L') {
      // Source alternates can insert into a different slot after a regrip.
      // Find the displaced bottom corner, then present its slot at front-right.
      const corner=s.find(st=>{
        const p=origins.get(st)!;
        return Math.round(p[1])===-1 && Math.abs(Math.round(p[0]))===1 && Math.abs(Math.round(p[2]))===1 && st.p.some((v,i)=>Math.abs(v-p[i])>0.01);
      });
      if(corner){const p=origins.get(corner)!;slot=[Math.round(p[0]),Math.round(p[2])];}
      const rotation=slot[0]===-1?(slot[1]===1?"y'":'y2'):slot[1]===-1?'y':null;
      if(rotation)for(const turn of railTurns(rotation))applyRailTurn(s,turn);
      const right=s.find(st=>st.p[0]===1 && st.p[1]===0 && st.p[2]===0)!.color;
      const front=s.find(st=>st.p[2]===1 && st.p[0]===0 && st.p[1]===0)!.color;
      for(const st of s)st.color=st.color===right?'#DC2626':st.color===front?'#16A34A':st.color==='#FFD700'?'#f8fafc':st.color;
    }
    const pair=new Set(s.filter(st=>{
      const [x,y,z]=origins.get(st)!.map(Math.round);
      return x===slot[0] && z===slot[1] && (y===-1 || y===0);
    }));
    return {stickers:s,pair};
  },[c.alg,c.subset]);
  if(c.subset==='F2L'){
    const project=(p:number[])=>[80+34*(p[0]-p[2]),83+17*(p[0]+p[2])-34*p[1]];
    return <svg role="img" aria-label={`${c.name}: target F2L pair and front-right slot; unrelated stickers are blank`} viewBox="0 0 160 176" className="w-32 h-36 shrink-0">
      <title>White / green / red pair · front-right slot</title>
      {stickers.filter(st=>st.p[0]===1 || st.p[1]===1 || st.p[2]===1).map((st,i)=>{
      const a=st.p.findIndex(v=>v===1),b=(a+1)%3,d=(a+2)%3;
      const pts=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>{const p=[...st.p];p[b]+=u/3;p[d]+=v/3;return project(p).join(',');}).join(' ');
      const center=st.p.filter(v=>v===0).length===2 && a!==1;
      const highlighted=pair.has(st) || center;
      // Canonical F2L reference palette: white down, green front, red right.
      // The underlying puzzle uses yellow down; only the diagram palette changes.
      const color=st.color==='#FFD700'?'#f8fafc':st.color;
      const [x,y,z]=st.p.map(Math.round);
      const slot=x===1 && z===1 && (y===-1 || y===0);
      return <polygon key={i} points={pts} fill={highlighted?color:a===1?'#52525b':a===2?'#34343d':'#27272f'} stroke={highlighted?'#09090b':slot?'#a5b4fc':'#71717a'} strokeWidth={highlighted?1.8:slot?1.6:0.8} strokeDasharray={!highlighted && slot?'3 2':undefined} strokeLinejoin="round"/>;
    })}
      <text x="48" y="167" textAnchor="middle" fill="#a1a1aa" fontSize="11" fontWeight="600">F</text>
      <text x="112" y="167" textAnchor="middle" fill="#a1a1aa" fontSize="11" fontWeight="600">R</text>
    </svg>;
  }
  const color=(p:number[])=>stickers.find(st=>st.p.every((v,i)=>Math.abs(v-p[i])<0.01))?.color??'#3f3f46';
  const top=[];
  for(let z=1;z>=-1;z--)for(let x=-1;x<=1;x++)top.push(<rect key={`t${x}${z}`} x={28+(x+1)*24} y={28+(1-z)*24} width="22" height="22" rx="2" fill={c.subset==='OLL' && color([x*2/3,1,z*2/3])!=='#FFFFFF'?'#3f3f46':color([x*2/3,1,z*2/3])}/>);
  const sides=[];
  for(let i=-1;i<=1;i++){
    sides.push(<rect key={`f${i}`} x={28+(i+1)*24} y="102" width="22" height="10" fill={color([i*2/3,2/3,1])}/>);
    sides.push(<rect key={`b${i}`} x={28+(i+1)*24} y="14" width="22" height="10" fill={color([i*2/3,2/3,-1])}/>);
    sides.push(<rect key={`l${i}`} x="14" y={28+(1-i)*24} width="10" height="22" fill={color([-1,2/3,i*2/3])}/>);
    sides.push(<rect key={`r${i}`} x="102" y={28+(1-i)*24} width="10" height="22" fill={color([1,2/3,i*2/3])}/>);
  }
  return <svg role="img" aria-label={`${c.name} setup preview`} viewBox="0 0 128 128" className="w-24 h-24 shrink-0">{top}{sides}</svg>;
}
