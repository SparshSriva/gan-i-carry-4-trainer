/**
 * KeybindReferenceModal.tsx — HyperSpeedCube Keybinding Reference & Interactive Tester.
 */

import React, { useState } from 'react';
import { X, Keyboard, Volume2, VolumeX, ShieldCheck } from 'lucide-react';
import { HYPERSPEEDCUBE_KEYBINDS, DIRECT_KEYBINDS, KeybindPresetId, KEYBIND_PRESETS } from '../utils/keybinds';

interface KeybindReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePreset: KeybindPresetId;
  onSelectPreset: (preset: KeybindPresetId) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const KeybindReferenceModal: React.FC<KeybindReferenceModalProps> = ({
  isOpen,
  onClose,
  activePreset,
  onSelectPreset,
  soundEnabled,
  onToggleSound,
}) => {
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleDown = (e: KeyboardEvent) => {
      setPressedKey(e.key.toLowerCase());
    };
    const handleUp = () => setPressedKey(null);
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentList = activePreset === 'hyperspeedcube' ? HYPERSPEEDCUBE_KEYBINDS : DIRECT_KEYBINDS;
  const leftHand = currentList.filter(k => k.hand === 'left');
  const rightHand = currentList.filter(k => k.hand === 'right');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white tracking-wide">
              Keyboard Simulator & Keybinds
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Selector & Options */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-zinc-800/40 border-b border-zinc-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-medium">Preset:</span>
            {(['hyperspeedcube', 'direct'] as KeybindPresetId[]).map(pid => (
              <button
                key={pid}
                onClick={() => onSelectPreset(pid)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activePreset === pid
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {KEYBIND_PRESETS[pid].name.split('/')[0].trim()}
              </button>
            ))}
          </div>

          <button
            onClick={onToggleSound}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium border transition-colors ${
              soundEnabled
                ? 'border-emerald-600/60 bg-emerald-950/40 text-emerald-300'
                : 'border-zinc-700 bg-zinc-800 text-zinc-500'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            {soundEnabled ? 'Audio Clicks ON' : 'Audio Muted'}
          </button>
        </div>

        {/* Key List Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          <p className="text-xs text-zinc-400">
            {KEYBIND_PRESETS[activePreset].description}. Press any key on your keyboard to test:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Hand */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Left Hand Controls
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                {leftHand.map(k => {
                  const isActive = pressedKey === k.key.toLowerCase();
                  return (
                    <div
                      key={k.key}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                        isActive
                          ? 'border-indigo-400 bg-indigo-900/60 text-white scale-105 shadow-md'
                          : 'border-zinc-800 bg-zinc-950/60 text-zinc-300'
                      }`}
                    >
                      <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-indigo-300">
                        {k.displayKey}
                      </span>
                      <span className="font-mono font-semibold text-white">{k.move}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Hand */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Right Hand Controls
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                {rightHand.map(k => {
                  const isActive = pressedKey === k.key.toLowerCase();
                  return (
                    <div
                      key={k.key}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                        isActive
                          ? 'border-indigo-400 bg-indigo-900/60 text-white scale-105 shadow-md'
                          : 'border-zinc-800 bg-zinc-950/60 text-zinc-300'
                      }`}
                    >
                      <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-indigo-300">
                        {k.displayKey}
                      </span>
                      <span className="font-mono font-semibold text-white">{k.move}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Global Shortcuts */}
          <div className="pt-2 border-t border-zinc-800">
            <h4 className="text-xs font-semibold text-zinc-400 mb-2">Trainer Shortcuts</h4>
            <div className="flex flex-wrap gap-3 text-xs text-zinc-300">
              <span className="px-2 py-1 bg-zinc-800 rounded font-mono">Space</span>
              <span className="self-center">Reveal Alg Hint (Blind Mode)</span>
              <span className="px-2 py-1 bg-zinc-800 rounded font-mono ml-4">Enter</span>
              <span className="self-center">Next Case (Review phase)</span>
              <span className="px-2 py-1 bg-zinc-800 rounded font-mono ml-4">Esc</span>
              <span className="self-center">Return to Case Selection</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 bg-zinc-950/80 border-t border-zinc-800 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Zero-lag reactive execution engine</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
