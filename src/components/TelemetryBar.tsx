/**
 * TelemetryBar — live metrics display below the 3D cube canvas.
 */

import { AttemptResult } from '../types';

interface TelemetryBarProps {
  last: AttemptResult | null;
}

export default function TelemetryBar({ last }: TelemetryBarProps) {
  if (!last) {
    return (
      <div className="flex items-center justify-around h-10 bg-zinc-800/50 rounded-lg text-zinc-600 text-xs">
        <span>No attempt yet</span>
      </div>
    );
  }

  const totalMs = last.recognitionMs + last.executionMs;
  const totalSec = (totalMs / 1000).toFixed(2);
  const recSec = (last.recognitionMs / 1000).toFixed(2);
  const execSec = (last.executionMs / 1000).toFixed(2);
  const tps = last.tps.toFixed(1);

  // Move delta micro-bars (each bar = 1 move transition)
  const maxDelta = Math.max(...last.moveDeltas, 1);
  const PAUSE_THRESHOLD = 300; // ms

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-around px-3 py-2 bg-zinc-800/50 rounded-lg text-xs">
        <Metric label="Total" value={`${totalSec}s`} highlight />
        <Metric label="Recog" value={`${recSec}s`} />
        <Metric label="Exec" value={`${execSec}s`} />
        <Metric label="TPS" value={`${tps}`} />
      </div>

      {/* Move delta bar chart */}
      {last.moveDeltas.length > 0 && (
        <div className="flex items-end gap-0.5 h-8 px-2">
          {last.moveDeltas.map((d, i) => {
            const height = Math.max(4, (d / maxDelta) * 32);
            const isPause = d > PAUSE_THRESHOLD;
            return (
              <div
                key={i}
                title={`Move ${i + 1}→${i + 2}: ${d}ms`}
                className={`flex-1 min-w-[4px] rounded-t transition-colors ${
                  isPause ? 'bg-red-500' : 'bg-indigo-500'
                }`}
                style={{ height }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-zinc-500 uppercase tracking-wider" style={{ fontSize: '9px' }}>{label}</span>
      <span className={`font-mono font-semibold ${highlight ? 'text-white text-sm' : 'text-zinc-300 text-xs'}`}>
        {value}
      </span>
    </div>
  );
}
