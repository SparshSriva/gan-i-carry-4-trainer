/**
 * App.tsx — root application component.
 * Links views, Web Bluetooth hardware layer for GAN i Carry 4,
 * ScrambleAssistant trainer state, HyperSpeedCube keyboard simulator,
 * and Voxygen 2D stereographic permutation engine.
 */

import { useState, useRef, useEffect } from 'react';
import { AppView, ConnectionStatus } from './types';
import { useTrainerState } from './hooks/useTrainerState';
import NavBar from './components/NavBar';
import TrainerView from './components/TrainerView';
import { KeybindReferenceModal } from './components/KeybindReferenceModal';
import { MacAddressModal } from './components/MacAddressModal';
import AnalyticsView from './components/AnalyticsView';
import LibraryView from './components/LibraryView';
import SolveTimerView from './components/SolveTimerView';
import { useSolveTimer } from './hooks/useSolveTimer';
import { loadGrip, saveGrip, physicalToGrip } from './utils/gripOrientation';
import { ganBluetooth } from './utils/ganBluetooth';
import BridgeConnectionModal from './components/BridgeConnectionModal';

export default function App() {
  const [grip,setGrip]=useState(loadGrip);
  useEffect(()=>saveGrip(grip),[grip]);
  const gripRef=useRef(grip);gripRef.current=grip;
  const [view, setView] = useState<AppView>('trainer');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [cubeName, setCubeName] = useState<string | null>(null);
  const [hardwareIssue,setHardwareIssue]=useState('');
  const [hardwareState,setHardwareState]=useState('Waiting for cube state');
  const [lastHardwareMove,setLastHardwareMove]=useState('No turns received');
  const [connectionError,setConnectionError]=useState('');
  const [keybindsOpen, setKeybindsOpen] = useState(false);
  const [transport,setTransport]=useState<'web'|'bridge'>(()=>{try{return localStorage.getItem('gan_connection_transport')==='bridge'?'bridge':'web';}catch{return 'web';}});
  const [bridgeOpen,setBridgeOpen]=useState(false);

  // MAC Address Modal state for browser BLE sandboxing fallback
  const [macModal, setMacModal] = useState<{
    isOpen: boolean;
    deviceName: string;
    resolve?: (mac: string | null) => void;
  }>({
    isOpen: false,
    deviceName: 'GAN Smart Cube',
  });

  const [state, actions] = useTrainerState(view === 'trainer' && !keybindsOpen && !macModal.isOpen && !bridgeOpen,grip);
  const timer=useSolveTimer(view==='timer' && !keybindsOpen && !macModal.isOpen && !bridgeOpen,state.simulatorMode,state.keybindPreset,grip);
  const timerRef=useRef(timer);timerRef.current=timer;
  const viewRef=useRef(view);viewRef.current=view;
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const simulatorRef=useRef(state.simulatorMode);simulatorRef.current=state.simulatorMode;

  const handleConnect = async (bridgeDevice?:{id:string;mac?:string}) => {
    // If already connected, toggle disconnect
    if (connectionStatus === 'connected') {
      await ganBluetooth.disconnect();
      timer.interrupt();
      actions.syncSolvedState();
      setConnectionStatus('disconnected');
      setBatteryLevel(null);
      setCubeName(null);
      return;
    }

    if(transport==='bridge' && !bridgeDevice){setBridgeOpen(true);return;}
    if (transport==='web' && !ganBluetooth.isSupported()) {
      alert(
        'Web Bluetooth is not supported in this browser.\nPlease use Google Chrome, Microsoft Edge, or Brave on desktop or laptop.'
      );
      return;
    }

    setConnectionStatus('connecting');
    setConnectionError('');
    let connectionStage=bridgeDevice?'Opening native cube connection':'Selecting cube and resolving its MAC';
    setHardwareIssue('');setHardwareState('Waiting for cube state');setLastHardwareMove('No turns received');

    try {
      const conn = await ganBluetooth.connect({
        bridgeDevice,
        onConnectionProgress:message=>{connectionStage=message;setHardwareState(message);},
        onMove: (move, timestamp,serial) => {
          const logical=physicalToGrip(move,gripRef.current);setLastHardwareMove(`GAN ${move} → ${logical} · packet ${serial}`);
          if(simulatorRef.current)return;
          if(viewRef.current==='timer')timerRef.current.feed(logical,timestamp,move);
          else if(viewRef.current==='trainer')actionsRef.current.feedMove(logical,timestamp);
        },
        onFacelets: facelets=>setHardwareState(facelets==='UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'?'Cube reports solved':'Cube reports an unsolved state — solve physically before starting'),
        onIntegrityIssue: message=>{setHardwareIssue(message);timerRef.current.interrupt();actionsRef.current.syncSolvedState();},
        onBattery: (level) => setBatteryLevel(level),
        onHardware: (info) => {
          if (info.hardwareName) {
            setCubeName(info.hardwareName);
          }
        },
        onDisconnect: () => {
          actionsRef.current.syncSolvedState();
          timerRef.current.interrupt();
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

      timerRef.current.interrupt();
      actionsRef.current.syncSolvedState();
      actionsRef.current.setSimulatorMode(false);
      setConnectionStatus('connected');
      setCubeName(conn.deviceName || 'GAN i Carry 4');
      setBridgeOpen(false);
    } catch (err: unknown) {
      console.error('Bluetooth connection error:', err);
      setConnectionStatus('disconnected');
      const error = err as { name?: string; message?: string };
      // Ignore user cancellation errors from browser device picker
      if (error.name !== 'NotFoundError' && !error.message?.includes('User cancelled')) {
        setConnectionError(`${connectionStage}: ${error.message || 'Connection failed'}`);
        alert(error.message?.includes('GATT Server is disconnected')?'The cube disconnected before Bluetooth service discovery. Close CubeStation and other cube apps, wake the cube, and retry nearby. You can also select Local bridge to use native Bluetooth.':error.message || 'Failed to connect to GAN cube.');
      }
    }
  };

  const handleSyncSolved = async () => {
    timer.interrupt();actions.syncSolvedState();
    try {
    if (ganBluetooth.isConnected()) {
      await ganBluetooth.resetCube();
    }
    setHardwareIssue('');setHardwareState('Solved origin reset — physical cube must be solved');setLastHardwareMove('No turns received since reset');
    }catch(err){setHardwareIssue(`Cube reset failed: ${err instanceof Error?err.message:'Bluetooth command failed'}. Reconnect before continuing.`);}
  };

  const downloadConnectionLog=()=>{
    const url=URL.createObjectURL(new Blob([ganBluetooth.exportConnectionLog()],{type:'text/plain'}));
    const link=document.createElement('a');link.href=url;link.download='gan-connection-log.txt';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
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

  const catalogProps={
    cases:state.cases,session:state.trainingSession,grip,onGripChange:setGrip,
    onSelect:(c:import('./types').AlgCase)=>{actions.selectCase(c);setView('trainer');},
    onNext:()=>{actions.nextCase();setView('trainer');},
    onToggleEntry:actions.toggleSessionEntry,onAddEntries:actions.addSessionEntries,
    onSelectionChange:actions.setSessionSelection,onSessionName:actions.setSessionName,
    onPreferVariant:actions.preferVariant,onStatusChange:actions.updateCaseStatus,onAddVariant:actions.addCustomVariant,
  };
  const handleNextFromReview = () => {
    actions.nextCase();
  };

  const hardwareBlocked=connectionStatus==='connected' && Boolean(hardwareIssue);

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden">
      <NavBar
        view={view}
        onViewChange={next=>{if(next!==view){timer.interrupt();actions.syncSolvedState();setView(next);}}}
        connectionStatus={connectionStatus}
        batteryLevel={batteryLevel}
        cubeName={cubeName}
        simulatorMode={state.simulatorMode}
        soundEnabled={state.soundEnabled}
        xpState={state.xpState}
        onConnect={()=>void handleConnect()}
        onSyncSolved={handleSyncSolved}
        onToggleSimulator={()=>{timer.interrupt();actions.syncSolvedState();actions.toggleSimulator();}}
        onToggleSound={actions.toggleSound}
        onOpenKeybinds={() => setKeybindsOpen(true)}
      />
      <div className="px-4 py-2 border-b border-zinc-800 text-xs text-zinc-400 flex flex-wrap gap-2 items-center"><label>Cube connection <select aria-label="Cube connection method" disabled={connectionStatus!=='disconnected'} value={transport} onChange={e=>{const value=e.target.value as 'web'|'bridge';setTransport(value);try{localStorage.setItem('gan_connection_transport',value);}catch{/* preference is optional */}}} className="ml-2 bg-zinc-900 border border-zinc-700 rounded p-1 text-white"><option value="web">Direct Web Bluetooth</option><option value="bridge">Local bridge · any browser</option></select></label>{transport==='bridge' && <span>Start npm run bridge, then Connect Cube.</span>}</div>

      <button onClick={downloadConnectionLog} className="self-start mx-4 my-1 text-xs text-zinc-400 underline">Download connection log</button>
      {connectionStatus==='connecting' && <p role="status" className="px-4 py-2 text-xs text-indigo-300">{hardwareState} Keep the cube awake and nearby.</p>}
      {connectionStatus==='disconnected' && connectionError && <p role="alert" className="px-4 py-2 text-xs text-amber-300">{connectionError}</p>}
      {connectionStatus==='connected' && <div role="status" className={`px-4 py-2 text-xs border-b ${hardwareIssue?'bg-amber-950/50 border-amber-800 text-amber-200':'bg-zinc-900 border-zinc-800 text-zinc-400'}`}>
        {hardwareIssue || `${hardwareState} · ${lastHardwareMove}. Start solved, choose your grip, then Sync Solved. Keep that physical grip during the attempt.`}
      </div>}

      <main className="flex-1 overflow-hidden">
        {hardwareBlocked && <p className="p-6 text-amber-200">Hardware tracking paused. Solve the physical cube, then select Sync Solved. If reset fails, disconnect and reconnect.</p>}
        {view === 'trainer' && !state.puzzleReady && <p role="status" className="p-6 text-zinc-400">Loading cube engine…</p>}
        {view === 'trainer' && state.puzzleReady && !hardwareBlocked && (
          <TrainerView
            catalogProps={catalogProps}
            phase={state.phase}
            grip={grip}
            onGripChange={setGrip}
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
            onBackToSession={actions.syncSolvedState}
            onStatusChange={actions.updateCaseStatus}
            onDismissXp={actions.dismissXpBanner}
            onFeedMove={actions.feedMove}
          />
        )}

        {view==='timer' && !hardwareBlocked && <SolveTimerView timer={timer} grip={grip} onGripChange={setGrip} simulator={state.simulatorMode} connected={connectionStatus==='connected'} />}
        {view === 'library' && !hardwareBlocked && (
          <LibraryView {...catalogProps}/>
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
      {bridgeOpen && <BridgeConnectionModal connecting={connectionStatus==='connecting'} onClose={()=>setBridgeOpen(false)} onConnect={(id,mac)=>void handleConnect({id,mac})}/>}
    </div>
  );
}
