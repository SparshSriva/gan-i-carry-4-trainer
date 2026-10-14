/**
 * App.tsx — root application component.
 * Links views, Web Bluetooth hardware layer for GAN i Carry 4,
 * ScrambleAssistant trainer state, HyperSpeedCube keyboard simulator,
 * and Voxygen 2D stereographic permutation engine.
 */

import { useState, useRef } from 'react';
import { AppView, ConnectionStatus } from './types';
import { useTrainerState } from './hooks/useTrainerState';
import NavBar from './components/NavBar';
import TrainerView from './components/TrainerView';
import { KeybindReferenceModal } from './components/KeybindReferenceModal';
import { MacAddressModal } from './components/MacAddressModal';
import AnalyticsView from './components/AnalyticsView';
import LibraryView from './components/LibraryView';
import { ganBluetooth } from './utils/ganBluetooth';

export default function App() {
  const [view, setView] = useState<AppView>('trainer');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [cubeName, setCubeName] = useState<string | null>(null);
  const [keybindsOpen, setKeybindsOpen] = useState(false);

  // MAC Address Modal state for browser BLE sandboxing fallback
  const [macModal, setMacModal] = useState<{
    isOpen: boolean;
    deviceName: string;
    resolve?: (mac: string | null) => void;
  }>({
    isOpen: false,
    deviceName: 'GAN Smart Cube',
  });

  const [state, actions] = useTrainerState(view === 'trainer' && !keybindsOpen && !macModal.isOpen);
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const handleConnect = async () => {
    // If already connected, toggle disconnect
    if (connectionStatus === 'connected') {
      await ganBluetooth.disconnect();
      setConnectionStatus('disconnected');
      setBatteryLevel(null);
      setCubeName(null);
      return;
    }

    if (!ganBluetooth.isSupported()) {
      alert(
        'Web Bluetooth is not supported in this browser.\nPlease use Google Chrome, Microsoft Edge, or Brave on desktop or laptop.'
      );
      return;
    }

    setConnectionStatus('connecting');

    try {
      const conn = await ganBluetooth.connect({
        onMove: (move, timestamp) => actionsRef.current.feedMove(move, timestamp),
        onBattery: (level) => setBatteryLevel(level),
        onHardware: (info) => {
          if (info.hardwareName) {
            setCubeName(info.hardwareName);
          }
        },
        onDisconnect: () => {
          actionsRef.current.syncSolvedState();
          setConnectionStatus('disconnected');
          setBatteryLevel(null);
          setCubeName(null);
        },
        onMacPrompt: (device) => {
          return new Promise<string | null>((resolve) => {
            setMacModal({
              isOpen: true,
              deviceName: device.name || 'GAN Smart Cube',
              resolve,
            });
          });
        },
      });

      actionsRef.current.setSimulatorMode(false);
      setConnectionStatus('connected');
      setCubeName(conn.deviceName || 'GAN i Carry 4');
    } catch (err: unknown) {
      console.error('Bluetooth connection error:', err);
      setConnectionStatus('disconnected');
      const error = err as { name?: string; message?: string };
      // Ignore user cancellation errors from browser device picker
      if (error.name !== 'NotFoundError' && !error.message?.includes('User cancelled')) {
        alert(error.message || 'Failed to connect to GAN cube.');
      }
    }
  };

  const handleSyncSolved = async () => {
    if (ganBluetooth.isConnected()) {
      await ganBluetooth.resetCube();
    }
    actions.syncSolvedState();
  };

  const handleMacSubmit = (mac: string) => {
    if (macModal.resolve) {
      macModal.resolve(mac);
    }
    setMacModal(prev => ({ ...prev, isOpen: false, resolve: undefined }));
  };

  const handleMacCancel = () => {
    if (macModal.resolve) {
      macModal.resolve(null);
    }
    setMacModal(prev => ({ ...prev, isOpen: false, resolve: undefined }));
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
        onSyncSolved={handleSyncSolved}
        onToggleSimulator={actions.toggleSimulator}
        onToggleSound={actions.toggleSound}
        onOpenKeybinds={() => setKeybindsOpen(true)}
      />

      <main className="flex-1 overflow-hidden">
        {view === 'trainer' && !state.puzzleReady && <p role="status" className="p-6 text-zinc-400">Loading cube engine…</p>}
        {view === 'trainer' && state.puzzleReady && (
          <TrainerView
            phase={state.phase}
            activeCase={state.activeCase}
            scrambleSnap={state.scrambleSnap}
            lastAttempt={state.lastAttempt}
            cases={state.cases}
            lastXpEvent={state.lastXpEvent}
            streak={state.streak}
            simulatorMode={state.simulatorMode}
            moveHistory={state.moveHistory}
            onSelectCase={actions.selectCase}
            onNextCase={actions.nextCase}
            onNextFromReview={handleNextFromReview}
            onStatusChange={actions.updateCaseStatus}
            onDismissXp={actions.dismissXpBanner}
            onFeedMove={actions.feedMove}
          />
        )}

        {view === 'library' && (
          <LibraryView cases={state.cases} onStatusChange={actions.updateCaseStatus}
            onTrain={c => { actions.selectCase(c); setView('trainer'); }} />
        )}
        {view === 'analytics' && <AnalyticsView cases={state.cases} />}
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

      {/* GAN MAC Address Modal (Fallback for Chrome BLE MAC Sandboxing) */}
      <MacAddressModal
        isOpen={macModal.isOpen}
        deviceName={macModal.deviceName}
        onSubmit={handleMacSubmit}
        onCancel={handleMacCancel}
      />
    </div>
  );
}
