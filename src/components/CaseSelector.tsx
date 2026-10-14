/**
 * CaseSelector — grid of algorithm cases for the CASE_SELECTION phase.
 */

import { AlgCase, AlgSubset } from '../types';
import { useState } from 'react';

const STATUS_DOT: Record<AlgCase['status'], string> = {
  unlearned: 'bg-zinc-500',
  learning:  'bg-yellow-400',
  learned:   'bg-emerald-400',
};

interface CaseSelectorProps {
  cases: AlgCase[];
  onSelect: (c: AlgCase) => void;
  onNext: () => void;
}

export default function CaseSelector({ cases, onSelect, onNext }: CaseSelectorProps) {
  const [filter, setFilter] = useState<AlgSubset | 'ALL'>('ALL');

  const visible = filter === 'ALL' ? cases : cases.filter(c => c.subset === filter);

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Controls */}
      <div className="flex items-center gap-2">
        {(['ALL', 'PLL', 'OLL', 'F2L'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
              filter === f
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700'
            }`}
          >
            {f}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={onNext}
          className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium"
        >
          Random Next →
        </button>
      </div>

      {/* Case grid */}
      <div className="flex-1 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 content-start">
        {visible.map(c => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className="relative flex flex-col items-center gap-1 p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-500 transition-colors text-left"
          >
            <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${STATUS_DOT[c.status]}`} />
            <span className="text-xs text-zinc-400 uppercase">{c.subset}</span>
            <span className="text-xs font-medium text-white text-center leading-tight">{c.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
