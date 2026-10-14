import { Wifi, WifiOff, Battery, RefreshCw, Keyboard } from 'lucide-react';
import { AppView, ConnectionStatus } from '../types';

interface NavBarProps {
  view: AppView;
  onViewChange: (v: AppView) => void;
  connectionStatus: ConnectionStatus;
  batteryLevel: number | null;
  cubeName: string | null;
  simulatorMode: boolean;
  onConnect: () => void;
  onSyncSolved: () => void;
  onToggleSimulator: () => void;
}

export default function NavBar({
  view,
  onViewChange,
  connectionStatus,
  batteryLevel,
  cubeName,
  simulatorMode,
  onConnect,
  onSyncSolved,
  onToggleSimulator,
}: NavBarProps) {
  const views: { id: AppView; label: string }[] = [
    { id: 'trainer', label: 'Trainer' },
    { id: 'library', label: 'Algorithm Library' },
    { id: 'analytics', label: 'Analytics' },
  ];

  return (
    <nav className="flex items-center justify-between px-4 h-12 bg-zinc-900 border-b border-zinc-700 select-none">
      {/* Branding */}
      <span className="text-sm font-bold text-white tracking-wide">
        GAN i4 Trainer
      </span>

      {/* View switcher */}
      <div className="flex gap-1">
        {views.map(v => (
          <button
            key={v.id}
            onClick={() => onViewChange(v.id)}
            className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
              view === v.id
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Hardware status */}
      <div className="flex items-center gap-2">
        {connectionStatus === 'connected' ? (
          <>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {cubeName ?? 'GAN i4'}
            </span>
            {batteryLevel !== null && (
              <span className="flex items-center gap-1 text-xs text-zinc-400">
                <Battery className="w-3.5 h-3.5" />
                {batteryLevel}%
              </span>
            )}
            <button
              onClick={onSyncSolved}
              title="Sync to solved state"
              className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-white border border-zinc-600 hover:border-zinc-400 rounded transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Sync
            </button>
          </>
        ) : (
          <button
            onClick={onConnect}
            disabled={connectionStatus === 'connecting'}
            className="flex items-center gap-1.5 px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded transition-colors"
          >
            {connectionStatus === 'connecting' ? (
              <Wifi className="w-3.5 h-3.5 animate-pulse" />
            ) : (
              <WifiOff className="w-3.5 h-3.5" />
            )}
            {connectionStatus === 'connecting' ? 'Connecting…' : 'Connect GAN Cube'}
          </button>
        )}

        <button
          onClick={onToggleSimulator}
          title="Toggle keyboard simulator"
          className={`flex items-center gap-1 px-2 py-1 text-xs border rounded transition-colors ${
            simulatorMode
              ? 'border-amber-500 text-amber-400 bg-amber-950'
              : 'border-zinc-600 text-zinc-500 hover:border-zinc-400 hover:text-zinc-300'
          }`}
        >
          <Keyboard className="w-3 h-3" />
          {simulatorMode ? 'Simulator ON' : 'Simulator'}
        </button>
      </div>
    </nav>
  );
}
