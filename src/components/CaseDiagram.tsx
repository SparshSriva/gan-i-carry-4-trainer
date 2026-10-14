import { useMemo } from 'react';
import type { AlgCase } from '../types';
import { invertAlg, parseAlg } from '../utils/moveUtils';
import { solvedStickers, railTurns, applyRailTurn } from '../utils/railMoves';
import { gripRotation } from '../utils/gripOrientation';
import type { GripFace } from '../utils/gripOrientation';

export default function CaseDiagram({ c }: {c:AlgCase}) {
  const stickers=useMemo(()=>{
    const s=solvedStickers();
    for(const move of parseAlg(invertAlg(c.alg)))for(const turn of railTurns(move))applyRailTurn(s,turn);
    const face=(p:number[]):GripFace=>p[0]===1?'R':p[0]===-1?'L':p[1]===1?'U':p[1]===-1?'D':p[2]===1?'F':'B';
    const white=s.find(st=>st.color==='#FFFFFF' && st.p.filter(v=>v===0).length===2)!;
    const green=s.find(st=>st.color==='#16A34A' && st.p.filter(v=>v===0).length===2)!;
    for(const move of gripRotation({up:face(white.p),front:face(green.p)}))for(const turn of railTurns(move))applyRailTurn(s,turn);
    return s;
  },[c.alg]);
  if(c.subset==='F2L'){
    const project=(p:number[])=>[64+25*(p[0]-p[2]),70-13*(p[0]+p[2])-26*p[1]];
    return <svg role="img" aria-label={`${c.name} setup preview`} viewBox="0 0 128 128" className="w-24 h-24 shrink-0">{stickers.filter(st=>st.p.some(v=>v===1)).filter(st=>st.p[0]===1 || st.p[1]===1 || st.p[2]===1).map((st,i)=>{
      const a=st.p.findIndex(v=>v===1),b=(a+1)%3,d=(a+2)%3;
      const pts=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>{const p=[...st.p];p[b]+=u/3;p[d]+=v/3;return project(p).join(',');}).join(' ');
      return <polygon key={i} points={pts} fill={st.color} stroke="#18181b" strokeWidth="1.5"/>;
    })}</svg>;
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
