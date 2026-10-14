/**
 * CaseCard — right-column case info panel.
 * Shows case name, algorithm, learning status selector, and training options.
 */

import { AlgCase } from '../types';

interface CaseCardProps {
  activeCase: AlgCase | null;
  hideAlg: boolean;
  onToggleHideAlg: () => void;
  onStatusChange: (status: AlgCase['status']) => void;
  onHintReveal: () => void;
  hintRevealed: boolean;
}

const STATUS_LABELS: Record<AlgCase['status'], string> = {
  unlearned: 'Unlearned',
  learning: 'Learning',
  learned: 'Learned',
};

const STATUS_COLORS: Record<AlgCase['status'], string> = {
  unlearned: 'bg-zinc-700 text-zinc-300',
  learning:  'bg-yellow-800 text-yellow-300',
  learned:   'bg-emerald-800 text-emerald-300',
};

export default function CaseCard({
  activeCase,
  hideAlg,
  onToggleHideAlg,
  onStatusChange,
  onHintReveal,
  hintRevealed,
}: CaseCardProps) {
  if (!activeCase) {
    return (
      <div className="flex items-center justify-center h-40 text-zinc-600 text-sm rounded-xl border border-zinc-700">
        No case selected
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-800/60 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs text-zinc-500 uppercase tracking-wide">{activeCase.subset}</span>
          <h2 className="text-lg font-bold text-white leading-tight">{activeCase.name}</h2>
        </div>
        {/* Learning status selector */}
        <div className="flex gap-1">
          {(['unlearned', 'learning', 'learned'] as AlgCase['status'][]).map(s => (
            <button
              key={s}
              onClick={() => onStatusChange(s)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-opacity ${STATUS_COLORS[s]} ${
                activeCase.status === s ? 'opacity-100 ring-2 ring-white/20' : 'opacity-40 hover:opacity-70'
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Algorithm display */}
      <div className="relative">
        {hideAlg && !hintRevealed ? (
          <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/70 rounded-lg">
            <span className="text-zinc-600 text-sm italic">Algorithm hidden</span>
            <button
              onClick={onHintReveal}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Hint / Reveal (Space)
            </button>
          </div>
        ) : (
          <div className="px-3 py-2 bg-zinc-900/70 rounded-lg">
            <p className="font-mono text-sm text-white break-all leading-relaxed">
              {activeCase.alg}
            </p>
          </div>
        )}
      </div>

      {/* Options */}
      <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={hideAlg}
          onChange={onToggleHideAlg}
          className="accent-indigo-500"
        />
        Hide algorithm during solve (Blind Recognition Mode)
      </label>

      {/* Quick stats */}
      {activeCase.attempts > 0 && (
        <div className="grid grid-cols-3 gap-2 pt-1">
          <Stat label="Attempts" value={String(activeCase.attempts)} />
          <Stat label="Avg Rec" value={`${(activeCase.avgRecognitionMs / 1000).toFixed(2)}s`} />
          <Stat label="Avg Exec" value={`${(activeCase.avgExecutionMs / 1000).toFixed(2)}s`} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-zinc-500 uppercase tracking-wider" style={{ fontSize: '9px' }}>{label}</p>
      <p className="text-zinc-200 text-xs font-mono font-medium">{value}</p>
    </div>
  );
}
