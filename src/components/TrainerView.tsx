/**
 * TrainerView.tsx — Two-column training workspace with multi-mode visualizer
 * (including 3D WebGL Cube and 2D Nine-Circles Permutation Graph side-by-side),
 * dynamic scramble assistant, telemetry, gamified rewards, and keybind reminders.
 */

import { useState, useEffect, useCallback } from 'react';
import { TrainerPhase, AlgCase, AttemptResult } from '../types';
import { ScrambleAssistantSnapshot } from '../utils/ScrambleAssistant';
import { XpEvent } from '../hooks/useXpSystem';
import CubeCanvas, { ViewMode } from './CubeCanvas';
import TelemetryBar from './TelemetryBar';
import StateBanner from './StateBanner';
import ScrambleStrip from './ScrambleStrip';
import CaseCard from './CaseCard';
import CaseSelector from './CaseSelector';
import { Box, Columns, Sparkles, Award, GitGraph } from 'lucide-react';

interface TrainerViewProps {
  phase: TrainerPhase;
  activeCase: AlgCase | null;
  scrambleSnap: ScrambleAssistantSnapshot | null;
  lastAttempt: AttemptResult | null;
  cases: AlgCase[];
  lastXpEvent: XpEvent | null;
  streak: number;
  simulatorMode: boolean;
  moveHistory: string[];
  onSelectCase: (c: AlgCase) => void;
  onNextCase: (pool?: AlgCase[]) => void;
  onNextFromReview: () => void;
  onStatusChange: (id: string, status: AlgCase['status']) => void;
  onDismissXp: () => void;
  onFeedMove: (move: string) => void;
}

export default function TrainerView({
  phase,
  activeCase,
  scrambleSnap,
  lastAttempt,
  cases,
  lastXpEvent,
  streak,
  simulatorMode,
  moveHistory,
  onSelectCase,
  onNextCase,
  onNextFromReview,
  onStatusChange,
  onDismissXp,
  onFeedMove,
}: TrainerViewProps) {
  // Default to dual split view: 3D cube + 2D 9-circles permutation graph alongside!
  const [cubeView, setCubeView] = useState<ViewMode>('split');
  const [hideAlg, setHideAlg] = useState(false);
  const [hintRevealed, setHintRevealed] = useState(false);

  const isScrambling = phase === 'SCRAMBLING';
  // Reset hint on a new attempt
  useEffect(() => {
    setHintRevealed(false);
  }, [activeCase?.id, isScrambling]);

  // Spacebar hint reveal & Enter to continue
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.repeat || (e.target instanceof HTMLElement && e.target.closest('input, textarea, select, button, [contenteditable], [role=dialog]'))) return;
    if (e.code === 'Space' && phase === 'RECOGNIZING' && hideAlg) {
      e.preventDefault();
      setHintRevealed(true);
    }
    if (e.code === 'Enter' && phase === 'REVIEW') {
      e.preventDefault();
      onNextFromReview();
    }
  }, [phase, hideAlg, onNextFromReview]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);


  const viewModes: { id: ViewMode; label: string; icon: typeof Box }[] = [
    { id: 'split', label: 'Dual View (3D + 2D)', icon: Columns },
    { id: '3d', label: '3D Cube', icon: Box },
    { id: '2d', label: 'Voxygen 2D', icon: GitGraph },
    { id: 'net', label: 'Facelet Net', icon: Box },
    { id: 'll', label: 'Last Layer', icon: Box },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 p-4 overflow-y-auto bg-zinc-950">
      {/* ── Left Column: Cube & Visualizer + Telemetry ─────────────────────── */}
      <div className="flex flex-col gap-3 w-full lg:w-[48%] lg:max-w-[540px] shrink-0">
        {/* Visualizer Mode Switcher */}
        <div className="flex items-center justify-between bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
          <div className="flex flex-wrap gap-1">
            {viewModes.map(m => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => setCubeView(m.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                    cubeView === m.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cube / Permutation Graph Canvas */}
        <CubeCanvas
          moveHistory={moveHistory}
          view={cubeView}
          interactive={simulatorMode && ['SCRAMBLING', 'ERROR_RECOVERY', 'RECOGNIZING', 'EXECUTING'].includes(phase)}
          onLayerClick={onFeedMove}
        />

        {/* Telemetry Bar */}
        <TelemetryBar last={lastAttempt} />

        {/* Simulator Key Quick Cheat-sheet */}
        {simulatorMode && (
          <div className="px-3 py-2 bg-zinc-900/60 border border-zinc-800/80 rounded-xl text-[11px] text-zinc-400">
            <span className="font-semibold text-zinc-300 mr-2">HyperSpeedCube Keys:</span>
            <span className="font-mono text-indigo-300">J/F</span> (U/U') •{' '}
            <span className="font-mono text-indigo-300">I/K</span> (R/R') •{' '}
            <span className="font-mono text-indigo-300">H/G</span> (F/F') •{' '}
            <span className="font-mono text-indigo-300">D/E</span> (L/L') •{' '}
            <span className="font-mono text-indigo-300">S/L</span> (D/D')
          </div>
        )}
      </div>

      {/* ── Right Column: Scramble Assistant + Case Card + Gamification ──── */}
      <div className="flex flex-col gap-3 flex-1 min-w-0 lg:overflow-y-auto">
        <StateBanner phase={phase} />
        {phase === 'SCRAMBLING' && <p className="text-xs text-zinc-400">Start with a solved cube, white on top and green in front. Follow the setup below.</p>}
        {phase === 'EXECUTING' && <p role="status" className="text-xs text-indigo-300">Keep solving. The attempt ends when the cube reaches the solved state.</p>}

        {/* Gamified XP Toast */}
        {phase === 'REVIEW' && lastXpEvent && (
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-950/80 via-indigo-950/80 to-purple-950/80 border border-amber-500/40 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-300 text-sm">
                    +{lastXpEvent.gained} XP Earned!
                  </span>
                  {streak > 1 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-900/60 text-orange-300 border border-orange-600/40 font-semibold">
                      🔥 {streak} Streak
                    </span>
                  )}
                  {lastXpEvent.newLevel !== undefined && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-600/40 font-bold flex items-center gap-1">
                      <Award className="w-3 h-3" /> Level Up: Lv.{lastXpEvent.newLevel + 1}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {lastXpEvent.breakdown.join(' • ')}
                </p>
              </div>
            </div>
            <button
              onClick={onDismissXp}
              className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        )}

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
              concealCase={hideAlg && (phase === 'RECOGNIZING' || phase === 'EXECUTING')}
              onToggleHideAlg={() => setHideAlg(v => !v)}
              onStatusChange={(s) => activeCase && onStatusChange(activeCase.id, s)}
              onHintReveal={() => setHintRevealed(true)}
              hintRevealed={hintRevealed}
            />

            {/* Review actions */}
            {phase === 'REVIEW' && (
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={onNextFromReview}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
                >
                  Next Case (Enter ↵)
                </button>
                <button
                  onClick={() => activeCase && onSelectCase(activeCase)}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.99] text-zinc-200 text-sm font-semibold rounded-xl border border-zinc-700 transition-all"
                >
                  Retry Case
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
