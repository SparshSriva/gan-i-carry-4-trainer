/**
 * MacAddressModal.tsx — Fallback MAC address prompt for GAN Smart Cubes.
 *
 * Browsers sandbox the BluetoothDevice object and hide the raw MAC address.
 * GAN i Carry 4 uses the MAC address as a salt for AES-128 key generation.
 * This modal allows the user to enter their MAC address once (cached in localStorage).
 */

import React, { useState } from 'react';
import { Bluetooth, ShieldAlert, X } from 'lucide-react';

interface MacAddressModalProps {
  isOpen: boolean;
  deviceName?: string;
  onSubmit: (mac: string) => void;
  onCancel: () => void;
}

export const MacAddressModal: React.FC<MacAddressModalProps> = ({
  isOpen,
  deviceName = 'GAN Smart Cube',
  onSubmit,
  onCancel,
}) => {
  const [mac, setMac] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMac = mac.trim().toUpperCase().replace(/[^0-9A-F:]/g, '');
    // Validate roughly XX:XX:XX:XX:XX:XX or XXXXXXXXXXXX
    if (cleanMac.length < 12) {
      setError('Please enter a valid 12-character MAC address (e.g. FD:12:34:56:78:9A)');
      return;
    }
    onSubmit(cleanMac);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-6 text-white space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Bluetooth className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base">GAN Cube MAC Address Needed</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative alert */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-950/40 border border-amber-600/40 text-xs text-amber-200">
          <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            Your browser hides Bluetooth MAC addresses for privacy. <strong>{deviceName}</strong> requires its MAC address to decrypt turns using AES-128.
          </div>
        </div>

        <p className="text-xs text-zinc-400">
          You can find your MAC address on the cube's packaging sticker or inside the official CubeStation app settings.
        </p>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Bluetooth MAC Address
            </label>
            <input
              type="text"
              autoFocus
              placeholder="e.g. FD:12:34:56:78:9A"
              value={mac}
              onChange={(e) => {
                setMac(e.target.value);
                setError('');
              }}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-sm font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
            />
            {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition-all active:scale-95"
            >
              Connect Cube
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MacAddressModal;
