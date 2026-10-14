/**
 * ganBluetooth.ts — Hardware Bluetooth GATT Client for GAN i Carry 4 Smart Cubes.
 *
 * Implements:
 * - Device discovery via Web Bluetooth (`navigator.bluetooth.requestDevice`)
 * - AES-128 CBC key derivation using cube MAC address salting
 * - RxJS event stream processing for real-time MOVE, BATTERY, and HARDWARE packets
 * - Fallback MAC address provider caching in localStorage
 */

import { connectGanCube, GanCubeConnection, GanCubeEvent } from 'gan-web-bluetooth';
import { Subscription } from 'rxjs';
import { GanMoveGuard } from './ganMoveGuard';

export interface BleHardwareInfo {
  hardwareName?: string;
  softwareVersion?: string;
  hardwareVersion?: string;
  productDate?: string;
  gyroSupported?: boolean;
}

export interface GanBluetoothCallbacks {
  onMove?: (move: string, timestamp: number, serial: number) => void;
  onFacelets?: (facelets: string) => void;
  onBattery?: (batteryLevel: number) => void;
  onHardware?: (info: BleHardwareInfo) => void;
  onDisconnect?: () => void;
  onMacPrompt?: (device: BluetoothDevice) => Promise<string | null>;
  onIntegrityIssue?: (message:string) => void;
}

class GanBluetoothManager {
  private connection: GanCubeConnection | null = null;
  private subscription: Subscription | null = null;
  private moveGuard=new GanMoveGuard();
  private trackingSuspended=false;

  /** Check if the current browser environment supports the Web Bluetooth API */
  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  /**
   * Connect to a nearby GAN Smart Cube via Web Bluetooth.
   */
  public async connect(callbacks: GanBluetoothCallbacks): Promise<GanCubeConnection> {
    if (!this.isSupported()) {
      throw new Error(
        'Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Brave on desktop/laptop.'
      );
    }

    // Custom MAC Address provider with localStorage caching and fallback callback
    const customMacProvider = async (device: BluetoothDevice, isFallbackCall?: boolean): Promise<string | null> => {
      const storageKey = `gan_cube_mac_${device.id}`;
      const cachedMac = localStorage.getItem(storageKey);

      if (cachedMac && !isFallbackCall) {
        return cachedMac;
      }

      // If library requires fallback and prompt callback is provided
      if (callbacks.onMacPrompt) {
        const userEnteredMac = await callbacks.onMacPrompt(device);
        if (userEnteredMac) {
          localStorage.setItem(storageKey, userEnteredMac);
          return userEnteredMac;
        }
      }

      return isFallbackCall ? null : cachedMac || null;
    };

    try {
      const conn = await connectGanCube(customMacProvider);
      this.connection = conn;
      this.moveGuard.reset();this.trackingSuspended=false;

      // Subscribe to reactive event stream
      this.subscription = conn.events$.subscribe({
        next: (event: GanCubeEvent) => {
          if(this.connection!==conn)return;
          this.handleEvent(event, callbacks);
        },
        error: (err) => {
          console.error('GAN BLE event stream error:', err);
          void this.disconnect();
          if (callbacks.onDisconnect) callbacks.onDisconnect();
        },
        complete: () => {
          if(this.connection!==conn)return;
          void this.disconnect();
          if (callbacks.onDisconnect) callbacks.onDisconnect();
        },
      });

      // Request initial facelets and battery info
      try {
        await conn.sendCubeCommand({ type: 'REQUEST_HARDWARE' });
        await conn.sendCubeCommand({ type: 'REQUEST_BATTERY' });
        await conn.sendCubeCommand({ type: 'REQUEST_FACELETS' });
      } catch (cmdErr) {
        console.warn('Initial command dispatch failed:', cmdErr);
      }

      if(this.connection!==conn)throw new Error('The cube disconnected while connecting. Try connecting again.');

      return conn;
    } catch (err) {
      await this.disconnect();
      throw err;
    }
  }

  private handleEvent(event: GanCubeEvent, callbacks: GanBluetoothCallbacks) {
    switch (event.type) {
      case 'MOVE':
        if(this.trackingSuspended)break;
        {
          const quality=this.moveGuard.accept(event.serial,event.localTimestamp);
          if(quality==='duplicate')break;
          if(quality!=='ok'){
            this.trackingSuspended=true;
            callbacks.onIntegrityIssue?.(quality==='gap'?'Bluetooth move sequence has a gap or is out of order. Solve the cube physically, then Sync Solved before continuing.':'A recovered Bluetooth turn has no reliable timestamp. Solve the cube physically, then Sync Solved before continuing.');
            break;
          }
        }
        if (callbacks.onMove) {
          callbacks.onMove(event.move, event.localTimestamp ?? Date.now(), event.serial);
        }
        break;

      case 'FACELETS':
        if (callbacks.onFacelets) {
          callbacks.onFacelets(event.facelets);
        }
        break;

      case 'BATTERY':
        if (callbacks.onBattery) {
          callbacks.onBattery(event.batteryLevel);
        }
        break;

      case 'HARDWARE':
        if (callbacks.onHardware) {
          callbacks.onHardware({
            hardwareName: event.hardwareName,
            softwareVersion: event.softwareVersion,
            hardwareVersion: event.hardwareVersion,
            productDate: event.productDate,
            gyroSupported: event.gyroSupported,
          });
        }
        break;

      case 'DISCONNECT':
        if (callbacks.onDisconnect) {
          callbacks.onDisconnect();
        }
        this.disconnect();
        break;
    }
  }

  /**
   * Reset cube logical state to solved.
   */
  public async resetCube(): Promise<void> {
    if (!this.connection) return;
    await this.connection.sendCubeCommand({ type: 'REQUEST_RESET' });
    this.moveGuard.reset();this.trackingSuspended=false;
  }

  /**
   * Disconnect the current Bluetooth GATT link.
   */
  public async disconnect(): Promise<void> {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    const connection=this.connection;this.connection=null;
    if (connection) {
      try {
        await connection.disconnect();
      } catch (err) {
        console.warn('Disconnect error:', err);
      }
    }
  }

  public isConnected(): boolean {
    return this.connection !== null;
  }

  public getDeviceName(): string | null {
    return this.connection?.deviceName || null;
  }
}

export const ganBluetooth = new GanBluetoothManager();
