/**
 * App.tsx — root component. Wires views, BLE stub, and trainer state.
 */

import { useState } from 'react';
import { AppView, ConnectionStatus } from './types';
import { useTrainerState } from './hooks/useTrainerState';
import NavBar from './components/NavBar';
import TrainerView from './components/TrainerView';

export default function App() {
  const [view, setView] = useState<AppView>('trainer');
  const [connectionStatus] = useState<ConnectionStatus>('disconnected');
  const [batteryLevel] = useState<number | null>(null);
  const [cubeName] = useState<string | null>(null);

  const [state, actions] = useTrainerState();

  const handleConnect = () => {
    // Milestone 3: BLE connection
    alert('BLE integration coming in Milestone 3. Use Simulator Mode for now.');
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
        onConnect={handleConnect}
        onSyncSolved={actions.syncSolvedState}
        onToggleSimulator={actions.toggleSimulator}
      />

      <main className="flex-1 overflow-hidden">
        {view === 'trainer' && (
          <TrainerView
            phase={state.phase}
            activeCase={state.activeCase}
            scrambleSnap={state.scrambleSnap}
            lastAttempt={state.lastAttempt}
            cases={state.cases}
            onSelectCase={actions.selectCase}
            onNextCase={actions.nextCase}
            onNextFromReview={handleNextFromReview}
            onStatusChange={actions.updateCaseStatus}
          />
        )}

        {view === 'library' && (
          <div className="flex items-center justify-center h-full text-zinc-500">
            Algorithm Library — coming in Milestone 3
          </div>
        )}

        {view === 'analytics' && (
          <div className="flex items-center justify-center h-full text-zinc-500">
            Analytics — coming in Milestone 4
          </div>
        )}
      </main>
    </div>
  );
}
