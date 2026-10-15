# Temporary GAN BLE connection lab

Run from the repository root:

```powershell
npm run test:ble
```

Open **http://127.0.0.1:5174/** in Edge or Chrome. This separate Vite app imports `gan-web-bluetooth` directly. It does not load React, the trainer, timer, viewer, manager, native bridge, grip conversion, move guard, GATT retry wrapper, or trainer preferences. HMR is disabled to avoid edits refreshing an active test. It uses the installed MIT dependency and reference initialization sequence, not a new GAN protocol implementation.

1. Disconnect the main trainer and other cube apps. Enable Bluetooth when ready, wake the cube, and enter its actual MAC if known.
2. Press **Connect cube** and select the cube. Leaving the MAC blank tries upstream advertisement lookup; if unavailable, a prompt asks for it.
3. Look for **Receiving decoded cube state**. GATT alone is insufficient. Gen3 move decoding requires an initial facelets serial.
4. Turn R, U, then U' slowly. Last turn, recent sequence, serial, timestamps and total should update. These are raw sensor faces without solving-grip remapping.
5. **Download log** preserves decoded events, services, timing and exceptions. **Disconnect** when finished. No automatic retries, reset, solve storage, uploads or idle scanning occur.

Battery and hardware/firmware depend on device support and may arrive after the snapshot. **Request state & battery** repeats hardware → facelets → battery. It does not reset state. **Clear readout** clears the event/move display and counter without disconnecting or changing the cube.

MAC input stays in memory and is omitted from explicit logs. Downloaded logs include browser version, device name, hardware responses and turn history. Reloading loses the log and disconnects the selected link. Closing the page releases the direct connection. Stop the server with Ctrl+C when no longer needed.

Build/type-check independently with `npm run build:ble`. Output is ignored `dist/ble-test/`; a subsequent main build clears `dist`, so rebuild the lab if production output is needed. Its dev command is independent of build output.

Validated: TypeScript/build, idle UI, invalid MAC rejection without BLE access, real-library synthetic Gen3 packets. Physical i Carry 4 connection remains unverified. See [research](../../docs/ICARRY4_BLE_RESEARCH.md).
