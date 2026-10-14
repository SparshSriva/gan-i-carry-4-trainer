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
import { connectNativeBridge } from './nativeBridge';
import { stabilizeGattDiscovery } from './gattDiscovery';
import { initializeCubeConnection } from './connectionHandshake.mjs';

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
  bridgeDevice?:{id:string;mac?:string};
  onConnectionProgress?:(message:string)=>void;
}

class GanBluetoothManager {
  private connection: GanCubeConnection | null = null;
  private subscription: Subscription | null = null;
  private moveGuard=new GanMoveGuard();
  private trackingSuspended=false;
  private connecting=false;

  /** Check if the current browser environment supports the Web Bluetooth API */
  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  /**
   * Connect to a nearby GAN Smart Cube via Web Bluetooth.
   */
  public async connect(callbacks: GanBluetoothCallbacks): Promise<GanCubeConnection> {
    if(this.connecting || this.connection)throw new Error('A cube connection is already active or being initialized.');
    if (!callbacks.bridgeDevice && !this.isSupported()) {
      throw new Error(
        'Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Brave on desktop/laptop.'
      );
    }

    this.connecting=true;
    let restoreDiscovery:(()=>void)|undefined;
    let selectedDevice:BluetoothDevice|undefined;
    // Custom MAC Address provider with localStorage caching and fallback callback
    const customMacProvider = async (device: BluetoothDevice, isFallbackCall?: boolean): Promise<string | null> => {
      selectedDevice=device;
      if(!isFallbackCall && device.gatt && !restoreDiscovery)restoreDiscovery=stabilizeGattDiscovery(device.gatt,callbacks.onConnectionProgress);
      const storageKey = `gan_cube_mac_${device.id}`;
      let cachedMac:string|null=null;
      try {const stored=localStorage.getItem(storageKey);if(/^(?:[0-9A-F]{2}:){5}[0-9A-F]{2}$/i.test(stored??''))cachedMac=stored;}catch{/* Cache availability must not block Bluetooth. */}

      // The first provider call precedes the library's advertisement lookup.
      // Only return a cached address here; manual entry belongs to its fallback.
      if (!isFallbackCall) return cachedMac || null;

      // If library requires fallback and prompt callback is provided
      if (callbacks.onMacPrompt) {
        const userEnteredMac = await callbacks.onMacPrompt(device);
        if (userEnteredMac) {
          try{localStorage.setItem(storageKey, userEnteredMac);}catch{/* An entered address still works without caching. */}
          return userEnteredMac;
        }
      }

      return isFallbackCall ? null : cachedMac || null;
    };

    try {
      const conn = callbacks.bridgeDevice?await connectNativeBridge(callbacks.bridgeDevice.id,callbacks.bridgeDevice.mac):await connectGanCube(customMacProvider);
      this.connection = conn;
      this.moveGuard.reset();this.trackingSuspended=false;

      // Subscribe to reactive event stream
      this.subscription = conn.events$.subscribe({
        next: (event: GanCubeEvent) => {
          if(this.connection!==conn)return;
          this.handleEvent(event, callbacks);
        },
        error: (err) => {
          if(this.connection!==conn)return;
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

      const initialFacelets=await initializeCubeConnection(conn,callbacks.onConnectionProgress);

      if(this.connection!==conn)throw new Error('The cube disconnected while connecting. Try connecting again.');
      callbacks.onFacelets?.(initialFacelets);

      return conn;
    } catch (err) {
      await this.disconnect();
      // connectGanCube can fail before returning its connection object.
      // Close the selected device's partial GATT link in that case as well.
      if(selectedDevice?.gatt?.connected)selectedDevice.gatt.disconnect();
      throw err;
    }finally{restoreDiscovery?.();this.connecting=false;}
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
          const stamp=event.localTimestamp??Date.now();
          const epoch=stamp>=1e12?stamp:Date.now()-performance.now()+stamp;
          callbacks.onMove(event.move, epoch, event.serial);
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
