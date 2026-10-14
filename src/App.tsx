/**
 * App.tsx — root application component.
 * Links views, Web Bluetooth hardware layer for GAN i Carry 4,
 * ScrambleAssistant trainer state, HyperSpeedCube keyboard simulator,
 * and Voxygen 2D stereographic permutation engine.
 */

import { useState } from 'react';
import { AppView, ConnectionStatus } from './types';
import { useTrainerState } from './hooks/useTrainerState';
import NavBar from './components/NavBar';
import TrainerView from './components/TrainerView';
import { KeybindReferenceModal } from './components/KeybindReferenceModal';
import { MacAddressModal } from './components/MacAddressModal';
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

  const [state, actions] = useTrainerState();

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
        onMove: (move) => actions.feedMove(move),
        onBattery: (level) => setBatteryLevel(level),
        onHardware: (info) => {
          if (info.hardwareName) {
            setCubeName(info.hardwareName);
          }
        },
        onDisconnect: () => {
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
