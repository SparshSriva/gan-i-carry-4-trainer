# Temporary GAN BLE connection lab

The owner's GANic4_3730 MAC is now hardcoded in `src/utils/knownCube.mjs` and prefilled here. Selecting that exact device uses the fixed address before any cache, advertisement lookup or prompt. The bridge also uses this mapping. Other device names are not automatically assigned this cube's address. Hardware testing is on hold at the owner's request; no automatic connection or reconnection occurs.

Run from the repository root:

```powershell
npm run test:ble
```

Open **http://127.0.0.1:5174/**. Direct mode imports `gan-web-bluetooth` directly. It does not load React, the trainer, timer, viewer, manager, grip conversion, move guard, GATT retry wrapper, or trainer preferences. HMR is disabled to avoid edits refreshing an active test. It uses the installed MIT dependency and reference initialization sequence, not a new GAN protocol implementation. Direct mode adds transparent observation of connect/service calls, with no retries, extra BLE requests or altered results.

1. Disconnect the main trainer and other cube apps. Enable Bluetooth when ready, wake the cube, and enter its actual MAC if known.
2. In Direct Web Bluetooth mode, press **Connect cube** and select the cube. Leaving the MAC blank tries upstream advertisement lookup; if unavailable, enter the MAC in the inline field and press Connect again. No browser `prompt()` is used.
3. Look for **Receiving decoded cube state**. GATT alone is insufficient. Gen3 move decoding requires an initial facelets serial.
4. Turn R, U, then U' slowly. Last turn, recent sequence, serial, timestamps and total should update. These are raw sensor faces without solving-grip remapping.
5. **Download log** preserves decoded events, services, timing and exceptions. **Disconnect** when finished. No automatic retries, reset, solve storage, uploads or idle scanning occur.

Battery and hardware/firmware depend on device support and may arrive after the snapshot. **Request state & battery** repeats hardware → facelets → battery. It does not reset state. **Clear readout** clears the event/move display and counter without disconnecting or changing the cube.

MAC input stays in memory and is omitted from explicit logs. Downloaded logs include browser version, device name, hardware responses and turn history. Reloading loses the log and disconnects the selected link. Closing the page releases the direct connection. Stop the server with Ctrl+C when no longer needed.

## Native comparison

Use one updated lab tab for testing. A Web Lock now prevents overlapping scans/connections between updated tabs at port 5174; another app or another origin is outside its scope. A manual cancel retains ownership until the pending browser setup settles. Close older lab pages before a physical test, since already-loaded versions do not acquire this lock.

Run `npm run bridge`, select **Local bridge · native Bluetooth**, and explicitly press **Scan native Bluetooth**. Select the cube from the resulting list, then **Connect cube**. This uses the existing native transport client and decoder, bypassing browser Bluetooth. It normally detects the actual address without manual entry. The loopback server permits this test page's port 5174. No scan or connection happens on page load or transport selection. Native connections close on explicit disconnect; closing the page stops its heartbeat and the server releases the lease after its 15-second timeout.

The direct trace distinguishes `gatt.connect BEGIN/RESOLVED/REJECTED` and `getPrimaryServices BEGIN/RESOLVED/REJECTED`, including actual connected flags and elapsed time. Methods are restored after setup. **Cancel connection** can close an already-open direct GATT link during pending discovery; a new attempt remains disabled until the outstanding browser operation settles. It cannot cancel the browser picker or an OS operation that ignores disconnection.

Windows native service discovery now explicitly requests uncached attributes. Failed/cancelled native setup releases the partial client. Replaced clients' late callbacks are ignored. These changes improve lifecycle handling but do not prove that a particular Windows service-discovery failure is repaired.

Build/type-check independently with `npm run build:ble`. Output is ignored `dist/ble-test/`; a subsequent main build clears `dist`, so rebuild the lab if production output is needed. Its dev command is independent of build output.

Validated: TypeScript/build, idle UI, invalid MAC rejection without BLE access, real-library synthetic Gen3 packets. Physical i Carry 4 connection remains unverified. See [research](../../docs/ICARRY4_BLE_RESEARCH.md).
