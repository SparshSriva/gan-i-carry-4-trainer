import React from 'react';
import { Wifi, WifiOff, Battery, RefreshCw, Keyboard, Volume2, VolumeX, Flame, Zap, Trophy } from 'lucide-react';
import { AppView, ConnectionStatus } from '../types';
import { XpState, levelName, xpForLevel } from '../hooks/useXpSystem';

interface NavBarProps {
  view: AppView;
  onViewChange: (v: AppView) => void;
  connectionStatus: ConnectionStatus;
  batteryLevel: number | null;
  cubeName: string | null;
  simulatorMode: boolean;
  soundEnabled: boolean;
  xpState: XpState;
  onConnect: () => void;
  onSyncSolved: () => void;
  onToggleSimulator: () => void;
  onToggleSound: () => void;
  onOpenKeybinds: () => void;
}

export const NavBar: React.FC<NavBarProps> = ({
  view,
  onViewChange,
  connectionStatus,
  batteryLevel,
  cubeName,
  simulatorMode,
  soundEnabled,
  xpState,
  onConnect,
  onSyncSolved,
  onToggleSimulator,
  onToggleSound,
  onOpenKeybinds,
}) => {
  const views: { id: AppView; label: string }[] = [
    { id: 'trainer', label: 'Trainer' },
    { id: 'timer', label: 'Solve Timer' },
    { id: 'library', label: 'Algorithm Library' },
    { id: 'analytics', label: 'Analytics' },
  ];

  return (
    <nav className="flex items-center justify-between px-4 py-2 min-h-13 flex-wrap gap-2 shrink-0 bg-zinc-950 border-b border-zinc-800 select-none shadow-md">
      {/* Branding & Level Pill */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-black bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent tracking-wide">
          GAN i4 Trainer
        </span>

        {/* Gamified Level & XP pill */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-700/60 text-xs">
          <div className="flex items-center gap-1 text-amber-400 font-bold">
            <Trophy className="w-3.5 h-3.5" />
            <span>Lv.{xpState.level + 1}</span>
            <span className="text-zinc-400 font-normal text-[11px] hidden md:inline">
              ({levelName(xpState.level)})
            </span>
          </div>

          <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-amber-400 rounded-full"
              style={{
                width: `${xpState.level >= 9 ? 100 : Math.min(100,
                  (xpState.totalXp - xpForLevel(xpState.level)) /
                  (xpForLevel(xpState.level + 1) - xpForLevel(xpState.level)) * 100)}%`,
              }}
            />
          </div>

          <span className="text-[10px] font-mono text-zinc-400">
            {xpState.totalXp} XP
          </span>
        </div>

        {/* Streak Pill */}
        {xpState.streak > 0 && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-950/70 border border-orange-500/50 text-xs text-orange-400 font-bold animate-pulse">
            <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
            <span>{xpState.streak}</span>
          </div>
        )}
      </div>

      {/* View switcher */}
      <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
        {views.map(v => (
          <button
            key={v.id}
            onClick={() => onViewChange(v.id)}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
              view === v.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Hardware & Controls */}
      <div className="flex items-center gap-2">
        {/* Sound toggle */}
        <button
          onClick={onToggleSound}
          title={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
          className={`p-1.5 rounded-lg border transition-colors ${
            soundEnabled
              ? 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white'
              : 'border-zinc-800 bg-zinc-950 text-zinc-600'
          }`}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>

        {/* Keybinds Reference Sheet */}
        <button
          onClick={onOpenKeybinds}
          title="Open HyperSpeedCube keybinds reference"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border border-indigo-700/60 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/60 hover:text-white transition-colors"
        >
          <Zap className="w-3 h-3 text-indigo-400" />
          <span className="hidden sm:inline">Keybinds</span>
        </button>

        {/* Simulator mode toggle */}
        <button
          onClick={onToggleSimulator}
          title="Toggle keyboard simulator"
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-colors ${
            simulatorMode
              ? 'border-amber-500/70 text-amber-300 bg-amber-950/60 shadow-sm'
              : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Keyboard className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{simulatorMode ? 'Sim Active' : 'Sim Off'}</span>
        </button>

        {/* Hardware status */}
        {connectionStatus === 'connected' ? (
          <>
            <button
              onClick={onConnect}
              title="Connected. Click to disconnect cube"
              className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-rose-300 font-medium px-2 py-1 bg-emerald-950/50 hover:bg-rose-950/40 rounded-lg border border-emerald-800 hover:border-rose-700/60 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {cubeName ?? 'GAN i4'}
            </button>
            {batteryLevel !== null && (
              <span className="flex items-center gap-1 text-xs text-zinc-400">
                <Battery className="w-3.5 h-3.5" />
                {batteryLevel}%
              </span>
            )}
            <button
              onClick={onSyncSolved}
              title="Sync to solved state"
              className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Sync
            </button>
          </>
        ) : (
          <button
            onClick={onConnect}
            disabled={connectionStatus === 'connecting'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            {connectionStatus === 'connecting' ? (
              <Wifi className="w-3.5 h-3.5 animate-pulse" />
            ) : (
              <WifiOff className="w-3.5 h-3.5" />
            )}
            <span className="hidden md:inline">
              {connectionStatus === 'connecting' ? 'Connecting…' : 'Connect Cube'}
            </span>
          </button>
        )}
      </div>
    </nav>
  );
};

export default NavBar;
