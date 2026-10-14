/**
 * StateBanner — full-width phase indicator strip.
 */

import { TrainerPhase } from '../types';

const BANNER: Record<TrainerPhase, { label: string; color: string }> = {
  IDLE:           { label: 'Disconnected',        color: 'bg-zinc-700 text-zinc-400' },
  CASE_SELECTION: { label: 'Select a Case',       color: 'bg-zinc-700 text-zinc-300' },
  SCRAMBLING:     { label: '🔀 Scramble Cube',    color: 'bg-blue-800 text-blue-200' },
  ERROR_RECOVERY: { label: '⚠ Fix Mistake',       color: 'bg-orange-700 text-orange-100' },
  RECOGNIZING:    { label: '👀 Recognize & Execute!', color: 'bg-violet-700 text-violet-100' },
  EXECUTING:      { label: '⚡ Executing…',       color: 'bg-indigo-700 text-indigo-100' },
  REVIEW:         { label: '✅ Complete!',         color: 'bg-emerald-700 text-emerald-100' },
};

export default function StateBanner({ phase }: { phase: TrainerPhase }) {
  const { label, color } = BANNER[phase] ?? BANNER['IDLE'];
  return (
    <div className={`flex items-center justify-center h-10 rounded-lg font-semibold text-sm tracking-wide ${color} transition-colors`}>
      {label}
    </div>
  );
}
