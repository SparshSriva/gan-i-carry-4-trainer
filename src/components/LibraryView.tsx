import { useState } from 'react';
import type { AlgCase, LearningStatus } from '../types';

interface Props {
  cases: AlgCase[];
  onStatusChange: (id: string, status: LearningStatus) => void;
  onTrain: (c: AlgCase) => void;
}

export default function LibraryView({ cases, onStatusChange, onTrain }: Props) {
  const [query, setQuery] = useState('');
  const [subset, setSubset] = useState('ALL');
  const visible = cases.filter(c => (subset === 'ALL' || c.subset === subset) &&
    `${c.name} ${c.alg}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="h-full overflow-y-auto p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">
    <div><h1 className="text-xl font-bold">Algorithm library</h1>
      <p className="text-sm text-zinc-400 mt-1">21 PLL cases and the current OLL starter set. Choose a learning status, then practice from a solved cube.</p></div>
    <div className="flex flex-wrap gap-3">
      <input aria-label="Search algorithms" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search case or notation…" className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm flex-1 min-w-48" />
      <select aria-label="Algorithm subset" value={subset} onChange={e => setSubset(e.target.value)} className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 text-sm"><option value="ALL">All subsets</option><option>PLL</option><option>OLL</option></select>
    </div>
    <p className="text-xs text-zinc-500">{visible.length} cases</p>
    {!visible.length && <p className="text-zinc-400">No cases match your search.</p>}
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{visible.map(c => <article key={c.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-3">
      <div className="flex justify-between gap-2"><h2 className="font-semibold">{c.name}</h2><span className="text-xs text-indigo-300">{c.subset}</span></div>
      <p className="font-mono text-sm text-zinc-300 leading-relaxed flex-1">{c.alg}</p>
      <p className="text-xs text-zinc-500">{c.attempts} attempts{c.attempts > 0 ? ` · ${(c.avgExecutionMs / 1000).toFixed(2)}s average execution` : ''}</p>
      <div className="flex justify-between gap-2">
        <select aria-label={`${c.name} learning status`} value={c.status} onChange={e => onStatusChange(c.id, e.target.value as LearningStatus)} className="text-xs bg-zinc-800 rounded-lg px-2 py-2"><option value="unlearned">Unlearned</option><option value="learning">Learning</option><option value="learned">Learned</option></select>
        <button onClick={() => onTrain(c)} className="text-sm bg-indigo-600 hover:bg-indigo-500 rounded-lg px-4 py-2">Practice</button>
      </div>
    </article>)}</div>
  </section>;
}
