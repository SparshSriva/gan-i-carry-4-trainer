import { useState } from 'react';
import type { AlgCase } from '../types';
import { loadHistory } from '../utils/storage';
import TelemetryBar from './TelemetryBar';

export default function AnalyticsView({ cases }: { cases: AlgCase[] }) {
  const [caseId, setCaseId] = useState('ALL');
  const [range, setRange] = useState('all');
  const [history] = useState(loadHistory);
  const [selected, setSelected] = useState<number | null>(null);
  const cutoff = range === 'week' ? Date.now() - 7 * 86400000 : 0;
  const attempts = history.filter(a => (caseId === 'ALL' || a.caseId === caseId) && a.timestamp >= cutoff);
  const average = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const recent = attempts.slice(-50);
  const detail = selected === null ? attempts[attempts.length - 1] : attempts.find(a => a.timestamp === selected);
  const max = Math.max(1, ...recent.map(a => a.recognitionMs + a.executionMs));
  const metrics = [
    ['Attempts', String(attempts.length)],
    ['Avg recognition', `${(average(attempts.map(a => a.recognitionMs)) / 1000).toFixed(2)}s`],
    ['Avg execution', `${(average(attempts.map(a => a.executionMs)) / 1000).toFixed(2)}s`],
    ['Avg TPS', average(attempts.map(a => a.tps)).toFixed(1)],
  ];
  return <section className="h-full overflow-y-auto p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
    <div><h1 className="text-xl font-bold">Practice analytics</h1><p className="text-sm text-zinc-400 mt-1">Recognition, execution, and pauses from completed attempts saved on this browser.</p></div>
    <div className="flex flex-wrap gap-3">
      <select aria-label="Filter analytics by case" value={caseId} onChange={e => { setCaseId(e.target.value); setSelected(null); }} className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm"><option value="ALL">All cases</option>{cases.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <select aria-label="History date range" value={range} onChange={e => { setRange(e.target.value); setSelected(null); }} className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm"><option value="all">All saved history</option><option value="week">Last 7 days</option></select>
    </div>
    {!attempts.length ? <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-400">No completed attempts in this selection. Practice a case to see your progress.</div> : <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{metrics.map(([label, value]) => <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"><p className="text-xs text-zinc-400">{label}</p><p className="text-2xl font-mono mt-2">{value}</p></div>)}</div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
        <h2 className="font-semibold">Recent attempt times</h2><p className="text-xs text-zinc-400">Last {recent.length} attempts, oldest first. Indigo: execution · amber: recognition. Select a bar for the move breakdown.</p>
        <div className="flex items-end gap-1 h-36">{recent.map((a, i) => <button key={`${a.timestamp}-${i}`} aria-label={`Attempt ${i + 1}: ${((a.recognitionMs + a.executionMs) / 1000).toFixed(2)} seconds`} title={`${cases.find(c => c.id === a.caseId)?.name ?? a.caseId}: ${((a.recognitionMs + a.executionMs) / 1000).toFixed(2)}s`} onClick={() => setSelected(a.timestamp)} className="flex-1 min-w-1 flex flex-col justify-end h-full group">
          <span className="block bg-amber-400 group-hover:bg-amber-300 rounded-t" style={{ height: `${a.recognitionMs / max * 100}%`, minHeight: 2 }} />
          <span className="block bg-indigo-500 group-hover:bg-indigo-400" style={{ height: `${a.executionMs / max * 100}%`, minHeight: 2 }} />
        </button>)}</div>
      </div>
      {detail && <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3"><h2 className="font-semibold">{cases.find(c => c.id === detail.caseId)?.name ?? detail.caseId} · Move breakdown</h2><TelemetryBar last={detail} /><p className="text-xs text-zinc-400">Red bars mark pauses longer than 300 ms.{detail.hadMistake ? ' Setup corrections occurred in this attempt.' : ''}</p></div>}
      <div className="overflow-x-auto rounded-xl border border-zinc-800"><table className="w-full text-sm text-left"><caption className="text-left p-4 font-semibold bg-zinc-900">Latest 20 attempts</caption><thead className="text-zinc-400 bg-zinc-900"><tr>{['Case', 'When', 'Recognition', 'Execution', 'TPS'].map(label => <th key={label} className="px-4 py-2 font-medium">{label}</th>)}</tr></thead><tbody>{attempts.slice(-20).reverse().map((a, i) => <tr key={`${a.timestamp}-${i}`} className="border-t border-zinc-800"><td className="px-4 py-3">{cases.find(c => c.id === a.caseId)?.name ?? a.caseId}</td><td className="px-4 text-zinc-400 whitespace-nowrap">{new Date(a.timestamp).toLocaleString()}</td><td className="px-4 font-mono">{(a.recognitionMs / 1000).toFixed(2)}s</td><td className="px-4 font-mono">{(a.executionMs / 1000).toFixed(2)}s</td><td className="px-4 font-mono">{a.tps.toFixed(1)}</td></tr>)}</tbody></table></div>
    </>}
  </section>;
}
