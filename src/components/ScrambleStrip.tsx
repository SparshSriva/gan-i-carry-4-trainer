/**
 * ScrambleStrip — renders the horizontal scramble token strip.
 * States: done (green/dim), half (amber, partial R2), active (white + ring), pending (zinc).
 */

import { ScrambleAssistantSnapshot } from '../utils/ScrambleAssistant';

interface ScrambleStripProps {
  snap: ScrambleAssistantSnapshot | null;
}

const TOKEN_CLASSES: Record<string, string> = {
  done:    'text-emerald-500 opacity-50',
  active:  'text-white font-bold ring-2 ring-white/60 bg-zinc-700 scale-110',
  half:    'text-amber-400 font-bold ring-2 ring-amber-400/60 bg-amber-950 scale-105',
  pending: 'text-zinc-400',
};

export default function ScrambleStrip({ snap }: ScrambleStripProps) {
  if (!snap) {
    return (
      <div className="flex items-center justify-center h-16 text-zinc-600 text-sm">
        No scramble loaded
      </div>
    );
  }

  const { tokens, assistantState, correctionQueue } = snap;

  return (
    <div className="space-y-2">
      {/* Main scramble tokens */}
      <div className="flex flex-wrap items-center gap-2 px-2 py-3 bg-zinc-800/50 rounded-lg min-h-[3.5rem]">
        {tokens.map((t, i) => (
          <span
            key={i}
            className={`
              inline-flex items-center justify-center min-w-[2.5rem] h-10 px-2
              rounded text-base font-mono transition-all duration-150
              ${TOKEN_CLASSES[t.state]}
            `}
          >
            {t.state === 'half' ? t.move.replace('2', '') : t.move}
          </span>
        ))}
      </div>

      {/* Correction queue banner */}
      {assistantState === 'error_recovery' && correctionQueue.length > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 bg-orange-900/60 border border-orange-500/40 rounded-lg text-sm text-orange-300">
          <span className="font-semibold">⚠ Fix:</span>
          <div className="flex gap-2 font-mono">
            {correctionQueue.map((m, i) => (
              <span key={i} className={i === 0 ? 'text-white font-bold' : 'text-orange-400 opacity-70'}>
                {m}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
