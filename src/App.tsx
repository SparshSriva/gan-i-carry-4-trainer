/**
 * App.tsx — root component. Wires views, BLE stub, trainer state,
 * HyperSpeedCube keybinding modal, and gamification layers.
 */

import { useState } from 'react';
import { AppView, ConnectionStatus } from './types';
import { useTrainerState } from './hooks/useTrainerState';
import NavBar from './components/NavBar';
import TrainerView from './components/TrainerView';
import { KeybindReferenceModal } from './components/KeybindReferenceModal';

export default function App() {
  const [view, setView] = useState<AppView>('trainer');
  const [connectionStatus] = useState<ConnectionStatus>('disconnected');
  const [batteryLevel] = useState<number | null>(null);
  const [cubeName] = useState<string | null>(null);
  const [keybindsOpen, setKeybindsOpen] = useState(false);

  const [state, actions] = useTrainerState();

  const handleConnect = () => {
    // Milestone 3: BLE connection
    alert('BLE integration connects in Milestone 3. Currently utilizing high-performance HyperSpeedCube keyboard simulator.');
  };

  const handleNextFromReview = () => {
    actions.nextCase();
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden">
      <NavBar
        view={view}
        onViewChange={setView}
        connectionStatus={connectionStatus}
        batteryLevel={batteryLevel}
        cubeName={cubeName}
        simulatorMode={state.simulatorMode}
        soundEnabled={state.soundEnabled}
        xpState={state.xpState}
        onConnect={handleConnect}
        onSyncSolved={actions.syncSolvedState}
        onToggleSimulator={actions.toggleSimulator}
        onToggleSound={actions.toggleSound}
        onOpenKeybinds={() => setKeybindsOpen(true)}
      />

      <main className="flex-1 overflow-hidden">
        {view === 'trainer' && (
          <TrainerView
            phase={state.phase}
            activeCase={state.activeCase}
            scrambleSnap={state.scrambleSnap}
            lastAttempt={state.lastAttempt}
            cases={state.cases}
            lastXpEvent={state.lastXpEvent}
            streak={state.streak}
            simulatorMode={state.simulatorMode}
            facelets={state.facelets}
            lastMove={state.lastMove}
            onSelectCase={actions.selectCase}
            onNextCase={actions.nextCase}
            onNextFromReview={handleNextFromReview}
            onStatusChange={actions.updateCaseStatus}
            onDismissXp={actions.dismissXpBanner}
            onFeedMove={actions.feedMove}
          />
        )}

        {view === 'library' && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-3">
            <h3 className="text-lg font-semibold text-white">Algorithm Library</h3>
            <p className="text-sm max-w-md text-center text-zinc-500">
              Browse all 21 PLL cases and 2-Look OLL cases directly in the Trainer view using the filter buttons (PLL / OLL / F2L). Full custom algorithm editing lands in Milestone 3.
            </p>
          </div>
        )}

        {view === 'analytics' && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-3">
            <h3 className="text-lg font-semibold text-white">Execution Analytics & Telemetry</h3>
            <p className="text-sm max-w-md text-center text-zinc-500">
              Granular time deltas and TPS breakdowns are displayed live below the cube in the Trainer view. Aggregate historical distribution charts land in Milestone 4.
            </p>
          </div>
        )}
      </main>

      {/* HyperSpeedCube Keybind Reference Modal */}
      <KeybindReferenceModal
        isOpen={keybindsOpen}
        onClose={() => setKeybindsOpen(false)}
        activePreset={state.keybindPreset}
        onSelectPreset={actions.setKeybindPreset}
        soundEnabled={state.soundEnabled}
        onToggleSound={actions.toggleSound}
      />
    </div>
  );
}
