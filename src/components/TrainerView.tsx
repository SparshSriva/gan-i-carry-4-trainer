/**
 * TrainerView — main 2-column trainer workspace.
 */

import { useState, useEffect, useCallback } from 'react';
import { TrainerPhase, AlgCase } from '../types';
import { ScrambleAssistantSnapshot } from '../utils/ScrambleAssistant';
import { AttemptResult } from '../types';
import { invertAlg } from '../utils/moveUtils';
import CubeCanvas from './CubeCanvas';
import TelemetryBar from './TelemetryBar';
import StateBanner from './StateBanner';
import ScrambleStrip from './ScrambleStrip';
import CaseCard from './CaseCard';
import CaseSelector from './CaseSelector';

interface TrainerViewProps {
  phase: TrainerPhase;
  activeCase: AlgCase | null;
  scrambleSnap: ScrambleAssistantSnapshot | null;
  lastAttempt: AttemptResult | null;
  cases: AlgCase[];
  onSelectCase: (c: AlgCase) => void;
  onNextCase: () => void;
  onNextFromReview: () => void;
  onStatusChange: (id: string, status: AlgCase['status']) => void;
}

export default function TrainerView({
  phase,
  activeCase,
  scrambleSnap,
  lastAttempt,
  cases,
  onSelectCase,
  onNextCase,
  onNextFromReview,
  onStatusChange,
}: TrainerViewProps) {
  const [cubeView, setCubeView] = useState<'3d' | 'top'>('3d');
  const [hideAlg, setHideAlg] = useState(false);
  const [hintRevealed, setHintRevealed] = useState(false);

  // Reset hint on new case
  useEffect(() => { setHintRevealed(false); }, [activeCase?.id]);

  // Spacebar hint reveal
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space' && phase === 'RECOGNIZING' && hideAlg) {
      e.preventDefault();
      setHintRevealed(true);
    }
    if (e.code === 'Enter' && phase === 'REVIEW') {
      onNextFromReview();
    }
  }, [phase, hideAlg, onNextFromReview]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const setupAlg = activeCase ? invertAlg(activeCase.alg) : '';

  return (
    <div className="flex h-full gap-4 p-4 overflow-hidden">
      {/* ── Left Column: 3D Cube + Telemetry ─────────────────────────────── */}
      <div className="flex flex-col gap-3 w-[42%] min-w-[280px]">
        {/* View toggle */}
        <div className="flex gap-1">
          {(['3d', 'top'] as const).map(v => (
            <button
              key={v}
              onClick={() => setCubeView(v)}
              className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                cubeView === v
                  ? 'bg-zinc-600 text-white'
                  : 'text-zinc-500 hover:text-zinc-300 bg-zinc-800'
              }`}
            >
              {v === '3d' ? '3D View' : 'Top-Down (OLL/PLL)'}
            </button>
          ))}
        </div>

        {/* Cube canvas */}
        <CubeCanvas
          setupAlg={phase !== 'CASE_SELECTION' ? setupAlg : ''}
          alg={phase === 'REVIEW' && activeCase ? activeCase.alg : ''}
          view={cubeView}
        />

        {/* Telemetry */}
        <TelemetryBar last={lastAttempt} />
      </div>

      {/* ── Right Column: Scramble Assistant + Case Card ──────────────────── */}
      <div className="flex flex-col gap-3 flex-1 min-w-0">
        <StateBanner phase={phase} />

        {phase === 'CASE_SELECTION' ? (
          <CaseSelector
            cases={cases}
            onSelect={onSelectCase}
            onNext={onNextCase}
          />
        ) : (
          <>
            <ScrambleStrip snap={scrambleSnap} />

            <CaseCard
              activeCase={activeCase}
              hideAlg={hideAlg}
              onToggleHideAlg={() => setHideAlg(v => !v)}
              onStatusChange={(s) => activeCase && onStatusChange(activeCase.id, s)}
              onHintReveal={() => setHintRevealed(true)}
              hintRevealed={hintRevealed}
            />

            {/* Review actions */}
            {phase === 'REVIEW' && (
              <div className="flex gap-2">
                <button
                  onClick={onNextFromReview}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Next Case (Enter)
                </button>
                <button
                  onClick={() => activeCase && onSelectCase(activeCase)}
                  className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm font-semibold rounded-lg transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
