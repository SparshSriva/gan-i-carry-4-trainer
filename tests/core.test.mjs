import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { puzzles } from 'cubing/puzzles';

// Transpile the app's pure TypeScript modules with its installed compiler.
async function sourceModule(path, imports = {}) {
  let source = await readFile(new URL(`../src/${path}`, import.meta.url), 'utf8');
  source = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
  for (const [specifier, url] of Object.entries(imports)) source = source.replaceAll(`'${specifier}'`, `'${url}'`);
  const url = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  return { url, exports: await import(url) };
}
const moves = await sourceModule('utils/moveUtils.ts');
const { ScrambleAssistant } = (await sourceModule('utils/ScrambleAssistant.ts', { './moveUtils': moves.url })).exports;
const catalog=JSON.parse(await readFile(new URL('../src/data/algorithmCatalog.json',import.meta.url),'utf8'));
const catalogUrl=`data:text/javascript;base64,${Buffer.from('export default '+JSON.stringify(catalog)).toString('base64')}`;
const databaseModule=await sourceModule('data/algDatabase.ts',{'./algorithmCatalog.json':catalogUrl});
const { ALL_CASES }=databaseModule.exports;
const puzzle = await puzzles['3x3x3'].kpuzzle();
const solved = p => p.experimentalIsSolved({ ignorePuzzleOrientation: true, ignoreCenterOrientation: true });
const assistant = alg => new ScrambleAssistant(alg, () => {});

test('direct half-turn tokens complete immediately', () => {
  const a = assistant('R2 U2'); a.feedMove('R2'); a.feedMove('U2'); assert.equal(a.isDone, true);
});
test('two clockwise or counterclockwise quarters complete a half turn', () => {
  for (const move of ['R', "R'"]) { const a = assistant('R2'); a.feedMove(move); assert.equal(a.snapshot().tokens[0].state, 'half'); a.feedMove(move); assert.equal(a.isDone, true); }
});
test('half-turn progress survives a long pause', () => {
  const original = Date.now; let now = 1000; Date.now = () => now;
  try { const a = assistant('R2'); a.feedMove('R'); now += 2000; a.feedMove('R'); assert.equal(a.isDone, true); } finally { Date.now = original; }
});
test('opposite quarters cancel a partial half-turn', () => {
  const a = assistant('R2'); a.feedMove('R'); a.feedMove("R'"); assert.equal(a.snapshot().tokens[0].state, 'active'); assert.deepEqual(a.snapshot().correctionQueue, []);
});
test('recovery preserves the half-turn already performed', () => {
  const a = assistant('R2 U'); for (const m of ['R', 'F', "F'"]) a.feedMove(m);
  assert.equal(a.snapshot().tokens[0].state, 'half'); a.feedMove('R'); a.feedMove('U'); assert.equal(a.isDone, true);
});
test('nested mistakes unwind in reverse order', () => {
  const a = assistant('U'); for (const m of ['R', 'F']) a.feedMove(m);
  assert.deepEqual(a.snapshot().correctionQueue, ["F'", "R'"]);
  for (const m of ["F'", "R'", 'U']) a.feedMove(m); assert.equal(a.isDone, true);
});
test('double-turn errors can be corrected using sensor quarter turns', () => {
  const a = assistant('U'); a.feedMove('R2'); a.feedMove("R'"); a.feedMove("R'"); a.feedMove('U'); assert.equal(a.isDone, true);
});
test('every library inverse setup can be solved with its algorithm', () => {
  for (const c of ALL_CASES) {
    const setup = puzzle.defaultPattern().applyAlg(moves.exports.invertAlg(c.alg));
    assert.equal(solved(setup), false, `${c.id} has a meaningful setup`);
    assert.equal(solved(setup.applyAlg(c.alg)), true, c.id);
  }
});
test('an arbitrary move count does not mean the cube is solved', () => {
  const c = ALL_CASES.find(c => c.id === 'pll-jb');
  const pattern = puzzle.defaultPattern().applyAlg(moves.exports.invertAlg(c.alg));
  assert.equal(solved(pattern.applyAlg(Array(moves.exports.etmCount(c.alg)).fill('R').join(' '))), false);
});
test('wrong execution turns can be undone before completing the case', () => {
  const c = ALL_CASES.find(c => c.id === 'pll-jb');
  const pattern = puzzle.defaultPattern().applyAlg(moves.exports.invertAlg(c.alg));
  assert.equal(solved(pattern.applyAlg(`F F' ${c.alg}`)), true);
});
test('weighted selection honors empty and subset/status pools', async () => {
  const { selectNextCase } = (await sourceModule('utils/weightedSelection.ts')).exports;
  assert.equal(selectNextCase(ALL_CASES, { statusFilter: ['learned'] }), null);
  for (let i = 0; i < 20; i++) assert.equal(selectNextCase(ALL_CASES, { statusFilter: ['unlearned'], subsetFilter: ['OLL'] }).subset, 'OLL');
});

test('XP events are deterministic and do not mutate previous state', async () => {
  const { awardXp } = (await sourceModule('hooks/useXpSystem.ts', { react: import.meta.resolve('react') })).exports;
  const previous = Object.freeze({ totalXp: 90, level: 0, xpToNext: 10, streak: 2, longestStreak: 2 });
  const attempt = { tps: 6, recognitionMs: 500 };
  const first = awardXp(previous, attempt, false);
  assert.deepEqual(first, awardXp(previous, attempt, false));
  assert.equal(first.event.gained, 32);
  assert.equal(first.event.newLevel, 1);
  assert.equal(first.state.totalXp, 122);
  assert.equal(first.event.breakdown.filter(s => s === '+10 base').length, 1);
  const mistaken = awardXp(previous, attempt, true);
  assert.equal(mistaken.state.streak, 0);
  assert.equal(mistaken.event.gained, 22);
});

test('a double turn after a partial half-turn requires recovery', () => {
  const a = assistant('R2 U'); a.feedMove('R'); a.feedMove('R2');
  assert.equal(a.isDone, false);
  assert.equal(a.assistantState, 'error_recovery');
  assert.deepEqual(a.snapshot().correctionQueue, ['R2']);
  a.feedMove('R2'); a.feedMove('R'); a.feedMove('U');
  assert.equal(a.isDone, true);
});

const railModel = (await sourceModule('utils/railMoves.ts')).exports;
const signature = stickers => stickers.map(s => `${s.p.join(',')}:${s.color}`).sort().join('|');
const runRails = alg => {
  const stickers = railModel.solvedStickers();
  for (const m of moves.exports.parseAlg(alg)) for (const t of railModel.railTurns(m)) railModel.applyRailTurn(stickers, t);
  return signature(stickers);
};
test('rail model supports all notation families and preserves all 54 slots', () => {
  const solved = runRails('');
  for (const face of 'RLUDFBrludfbMESxyz') {
    assert.notEqual(runRails(face), solved, face);
    assert.equal(runRails(`${face} ${face} ${face} ${face}`), solved, face);
    assert.equal(runRails(`${face} ${face}'`), solved, face);
    assert.equal(runRails(`${face}2 ${face}2`), solved, face);
    const stickers = railModel.solvedStickers();
    for (const t of railModel.railTurns(face)) railModel.applyRailTurn(stickers, t);
    assert.equal(new Set(stickers.map(s => s.p.join(','))).size, 54, face);
  }
});
test('rail wide turns and rotations agree with face/slice decompositions', () => {
  for (const [a, b] of [['r', "R M'"], ['l', 'L M'], ['u', "U E'"], ['d', 'D E'], ['f', 'F S'], ['b', "B S'"], ['x', "R M' L'"], ['y', "U E' D'"], ['z', "F S B'"]]) assert.equal(runRails(a), runRails(b), a);
});
test('every catalog case returns the rails to solved after its inverse setup', () => {
  for (const c of ALL_CASES) assert.equal(runRails(`${moves.exports.invertAlg(c.alg)} ${c.alg}`), runRails(''), c.id);
});

test('view orientation wraps turns and clamps tilt', async () => {
  const { normalizeOrientation } = (await sourceModule('utils/cubeOrientation.ts')).exports;
  assert.deepEqual(normalizeOrientation({ yaw: 390, pitch: 120, roll: -370 }), { yaw: 30, pitch: 89, roll: -10 });
});
test('view alignment persists and invalid storage falls back to the default', async () => {
  const orientation = (await sourceModule('utils/cubeOrientation.ts')).exports;
  const original = globalThis.localStorage;
  let saved = null;
  globalThis.localStorage = { getItem: () => saved, setItem: (_key, value) => { saved = value; } };
  try {
    orientation.saveOrientation({ yaw: -30, pitch: 55, roll: 15 });
    assert.deepEqual(orientation.loadOrientation(), { yaw: -30, pitch: 55, roll: 15 });
    saved = '{"yaw":"invalid","pitch":0,"roll":0}';
    assert.deepEqual(orientation.loadOrientation(), orientation.DEFAULT_CUBE_ORIENTATION);
    saved = 'broken json';
    assert.deepEqual(orientation.loadOrientation(), orientation.DEFAULT_CUBE_ORIENTATION);
  } finally { if (original === undefined) delete globalThis.localStorage; else globalThis.localStorage = original; }
});

const gripModel=(await sourceModule('utils/gripOrientation.ts')).exports;
test('all 24 solving frames map GAN sensor faces consistently with the displayed rotation',()=>{
  const faces='URFDLB';let count=0;
  for(const up of faces)for(const front of faces){const grip={up,front};if(!gripModel.validGrip(grip))continue;count++;
    const q=gripModel.gripRotation(grip).join(' '),map=gripModel.gripMap(grip);
    assert.equal(new Set(Object.values(map)).size,6);
    for(const raw of faces){const local=gripModel.physicalToGrip(raw,grip);
      assert.equal(solved(puzzle.defaultPattern().applyAlg(`${raw} ${q} ${local}'`)),true,`${up}/${front}: ${raw} -> ${local}`);
      assert.equal(gripModel.physicalToGrip(`${raw}2`,grip),`${local}2`);
    }
  }assert.equal(count,24);
});
test('drag snapping picks a valid up/front frame',()=>{
  assert.deepEqual(gripModel.snapGrip({yaw:30,pitch:35,roll:0},gripModel.DEFAULT_GRIP),gripModel.DEFAULT_GRIP);
  assert.deepEqual(gripModel.snapGrip({yaw:120,pitch:0,roll:0},gripModel.DEFAULT_GRIP),{up:'U',front:'R'});
  for(let yaw=-180;yaw<180;yaw+=30)for(let pitch=-80;pitch<90;pitch+=20)assert.equal(gripModel.validGrip(gripModel.snapGrip({yaw,pitch,roll:45},gripModel.DEFAULT_GRIP)),true);
});
const sessionModule=await sourceModule('utils/solveSession.ts',{'./ScrambleAssistant':(await sourceModule('utils/ScrambleAssistant.ts',{'./moveUtils':moves.url})).url});
const sessionModel=sessionModule.exports;
const groupsModel=(await sourceModule('utils/solveGroups.ts')).exports;
test('solve groups isolate histories and migrate old records without changing them',()=>{
  const records=[{durationMs:1000},{groupId:'oh',durationMs:2000},{groupId:'roux',durationMs:3000}];
  assert.deepEqual(groupsModel.groupSolves(records,'regular-3x3'),[records[0]]);
  assert.deepEqual(groupsModel.groupSolves(records,'oh'),[records[1]]);
  assert.equal(records[0].groupId,undefined);
  const original=globalThis.localStorage;let stored=null;
  globalThis.localStorage={getItem:()=>stored,setItem:(_key,value)=>{stored=value;}};
  try {
    groupsModel.saveSolveGroups([...groupsModel.DEFAULT_SOLVE_GROUPS,{id:'custom',name:'Roux blocks'}],'custom');
    const loaded=groupsModel.loadSolveGroups();assert.equal(loaded.activeId,'custom');assert.equal(loaded.groups.length,4);
  }finally{if(original===undefined)delete globalThis.localStorage;else globalThis.localStorage=original;}
});
test('a completed solve retains its group snapshot and group averages are isolated',()=>{
  const s=new sessionModel.SolveSession(puzzle,'R',gripModel.DEFAULT_GRIP,'manual',{kind:'custom'},{id:'oh',name:'OH practice'});
  s.useManualSetup(1000);s.start(2000);const result=s.finish(5000);
  assert.equal(result.groupId,'oh');assert.equal(result.groupName,'OH practice');
  assert.equal(sessionModel.solveSummary(groupsModel.groupSolves([result,{...result,groupId:'roux',durationMs:100}], 'oh')).meanMs,3000);
});
test('GAN stream guard rejects gaps and untimed recovery, ignores duplicates and handles serial wrap',async()=>{
  const {GanMoveGuard}=(await sourceModule('utils/ganMoveGuard.ts')).exports;
  const guard=new GanMoveGuard();assert.equal(guard.accept(255,1000),'ok');assert.equal(guard.accept(255,1001),'duplicate');assert.equal(guard.accept(0,1002),'ok');assert.equal(guard.accept(2,1003),'gap');
  guard.reset();assert.equal(guard.accept(30,null),'untimed');guard.reset();assert.equal(guard.accept(99,2000),'ok');
});
test('general timer preserves scramble, frame, raw and logical solution events and timing',()=>{
  const s=new sessionModel.SolveSession(puzzle,"R U",{up:'U',front:'R'},'gan');
  s.feed('R',1000,'B');s.feed('U',1100,'U');assert.equal(s.phase,'ready');
  assert.equal(s.feed("U'",1500,"U'"),null);
  const r=s.feed("R'",2000,"B'");assert.equal(r.durationMs,500);assert.equal(r.inspectionMs,400);
  assert.equal(r.scramble,'R U');assert.deepEqual(r.startingGrip,{up:'U',front:'R'});
  assert.deepEqual(r.solution.map(m=>[m.move,m.rawMove,m.elapsedMs]),[["U'","U'",0],["R'","B'",500]]);
  assert.equal(r.solved,true);assert.equal(s.feed('R',2100),null);assert.equal(s.finish(2200),null);
});
test('timer does not finish on incorrect moves and saves interrupted runs as DNF',()=>{
  const s=new sessionModel.SolveSession(puzzle,'R U',gripModel.DEFAULT_GRIP,'simulator');s.useManualSetup(1000);s.feed('F',1500);s.feed('R',1600);assert.equal(s.phase,'solving');
  const r=s.finish(2000,'dnf');assert.equal(r.solved,false);assert.equal(r.termination,'dnf');assert.equal(r.solution.length,2);
});
test('manual timer saves an explicitly unverified time with no fabricated moves',()=>{
  const s=new sessionModel.SolveSession(puzzle,'R U',gripModel.DEFAULT_GRIP,'manual');s.useManualSetup(1000);s.start(2000);const r=s.finish(5000);
  assert.equal(r.durationMs,3000);assert.equal(r.solved,false);assert.equal(r.source,'manual');assert.deepEqual(r.solution,[]);
});
test('scramble validation rejects unsupported notation',()=>{
  assert.throws(()=>sessionModel.validateScramble('R potato U'));assert.throws(()=>sessionModel.validateScramble(''));assert.throws(()=>sessionModel.validateScramble('x R'));
  assert.equal(sessionModel.validateScramble(" R   U2 F' "),"R U2 F'");
});

test('rolling solve averages trim extremes and handle DNF',()=>{
  const records=[1000,2000,3000,4000,5000].map(durationMs=>({durationMs,termination:'solved'}));
  assert.equal(sessionModel.rollingAverage(records,5),3000);
  assert.equal(sessionModel.rollingAverage(records.slice(0,4),5),null);
  assert.equal(sessionModel.rollingAverage([...records.slice(0,4),{durationMs:0,termination:'dnf'}],5),3000);
  assert.equal(sessionModel.rollingAverage([...records.slice(0,3),{durationMs:0,termination:'dnf'},{durationMs:0,termination:'dnf'}],5),'DNF');
});

test('catalog has complete CFOP sections and preserves every sourced alternate',()=>{
  assert.equal(ALL_CASES.filter(c=>c.subset==='OLL').length,57);
  assert.equal(ALL_CASES.filter(c=>c.subset==='PLL').length,21);
  assert.equal(ALL_CASES.filter(c=>c.subset==='F2L').length,41);
  assert.equal(ALL_CASES.reduce((n,c)=>n+c.variants.length,0),272);
  assert.equal(new Set(ALL_CASES.map(c=>c.id)).size,119);
  for(const c of ALL_CASES)for(const v of c.variants){
    assert.ok(c.group && v.sourceUrl);
    const tokens=moves.exports.parseAlg(v.alg);assert.equal(tokens.join(' '),v.alg,v.id);
    assert.equal(solved(puzzle.defaultPattern().applyAlg(moves.exports.invertAlg(v.alg)).applyAlg(v.alg)),true,v.id);
  }
});
test('training sessions can hold multiple alternates and resolve their own setups',async()=>{
  const {toggleTrainingEntry,resolveEntry}= (await sourceModule('utils/trainingSession.ts')).exports;
  const c=ALL_CASES.find(c=>c.id==='oll-sune');
  let s={id:'session',name:'Practice',selection:'balanced',entries:[]};
  for(const v of c.variants)s=toggleTrainingEntry(s,{caseId:c.id,variantId:v.id});
  assert.equal(s.entries.length,c.variants.length);
  for(const e of s.entries){const selected=resolveEntry(ALL_CASES,e);assert.equal(selected.alg,c.variants.find(v=>v.id===e.variantId).alg);assert.equal(selected.preferredVariantId,e.variantId);}
  s=toggleTrainingEntry(s,s.entries[0]);assert.equal(s.entries.length,c.variants.length-1);
});
test('case preferences and per-variant telemetry persist independently',async()=>{
  const storage=(await sourceModule('utils/storage.ts',{'../data/algDatabase':databaseModule.url})).exports;
  const original=globalThis.localStorage,values=new Map();globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
  try{
    const c=ALL_CASES.find(c=>c.id==='oll-sune'),v=c.variants[1];
    const attempt={caseId:c.id,variantId:v.id,recognitionMs:500,executionMs:1000,tps:7,moveDeltas:[100],timestamp:2000};
    const updated=storage.updateCaseStats(ALL_CASES.map(item=>item.id===c.id?{...item,alg:v.alg,preferredVariantId:v.id}:item),attempt,false);
    storage.saveCases(updated);const loaded=storage.loadCases().find(item=>item.id===c.id);
    assert.equal(loaded.alg,v.alg);assert.equal(loaded.preferredVariantId,v.id);assert.equal(loaded.variantStats[v.id].attempts,1);
    assert.equal(loaded.variants.length,c.variants.length);
  }finally{if(original===undefined)delete globalThis.localStorage;else globalThis.localStorage=original;}
});
test('official generation verifies signed TNoodle before accepting a scramble',async()=>{
  const {generateOfficialScramble}= (await sourceModule('utils/officialScramble.ts',{'./solveSession':sessionModule.url})).exports;
  const original=globalThis.fetch,calls=[];
  globalThis.fetch=async(url,options)=>{calls.push([url,options?.method]);return {ok:true,json:async()=>url.endsWith('/version')?{projectName:'TNoodle-WCA',projectVersion:'1.2.3',signedBuild:true}:{scramble:"R U2 F'"}};};
  try{const result=await generateOfficialScramble();assert.equal(result.provenance.kind,'tnoodle-wca');assert.equal(result.provenance.version,'1.2.3');assert.equal(calls[1][1],'POST');
    globalThis.fetch=async()=>({ok:true,json:async()=>({projectName:'TNoodle-WCA',projectVersion:'1.2.3',signedBuild:false})});
    await assert.rejects(generateOfficialScramble(),/signed TNoodle/);
  }finally{globalThis.fetch=original;}
});
