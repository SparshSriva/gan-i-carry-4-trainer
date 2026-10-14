export interface SolveGroup { id: string; name: string }
export const DEFAULT_SOLVE_GROUP='regular-3x3';
export const DEFAULT_SOLVE_GROUPS: SolveGroup[]=[
  {id:DEFAULT_SOLVE_GROUP,name:'Regular 3×3'},
  {id:'oh',name:'One-handed (OH)'},
  {id:'roux',name:'Roux'},
];
const KEY='ganicv4_solve_groups_v1';
export function loadSolveGroups(): {groups:SolveGroup[];activeId:string} {
  try {
    const saved=JSON.parse(localStorage.getItem(KEY)??'null');
    const custom: SolveGroup[]=Array.isArray(saved?.groups)?saved.groups.filter((g:SolveGroup)=>typeof g?.id==='string' && typeof g?.name==='string' && g.name.trim().length>0 && g.name.length<=60):[];
    const groups=[...DEFAULT_SOLVE_GROUPS.map(g=>custom.find(c=>c.id===g.id)??{...g}),...custom.filter((g,i)=>!DEFAULT_SOLVE_GROUPS.some(d=>d.id===g.id) && custom.findIndex(c=>c.id===g.id)===i)];
    return {groups,activeId:groups.some(g=>g.id===saved?.activeId)?saved.activeId:DEFAULT_SOLVE_GROUP};
  }catch{return {groups:DEFAULT_SOLVE_GROUPS.map(g=>({...g})),activeId:DEFAULT_SOLVE_GROUP};}
}
export function saveSolveGroups(groups:SolveGroup[],activeId:string):void {localStorage.setItem(KEY,JSON.stringify({groups,activeId}));}
export function groupSolves<T extends {groupId?:string}>(records:T[],id:string):T[] {
  return records.filter(r=>(r.groupId??DEFAULT_SOLVE_GROUP)===id);
}
