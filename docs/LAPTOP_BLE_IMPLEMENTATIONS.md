# Existing laptop GAN connection implementations

Research reviewed October 14, 2026. This pass examines actual desktop source code, without installing/running third-party applications or accessing the cube.

## Correct problem statement

The user has selected/paired GANic4_3730 on the laptop and supplied its fixed MAC. The app's trace reports successful `gatt.connect()`, followed by a stalled `getPrimaryServices()` and disconnect. The missing step is a usable GATT service/characteristic connection for packet exchange. Repeating MAC entry, pairing explanations or changes to AES/move parsing does not address that observed stage.

CubeStation works on the user's **phone**. That establishes functioning cube hardware and an official mobile integration. It is not evidence of a previously working laptop GATT path. No new hardware test is authorized.

## Source-level comparison

### SharpTimer: native C# / WinUI 3 on Windows

- Repository: https://github.com/huizhiLLL/SharpTimer
- Device opening: https://github.com/huizhiLLL/SharpTimer/blob/master/SharpTimer.Bluetooth/WindowsBleSmartCubeConnector.cs
- GAN initialization and discovery: https://github.com/huizhiLLL/SharpTimer/blob/master/SharpTimer.Bluetooth/WindowsBleGanSmartCubeConnection.cs
- Service/model definitions: https://github.com/huizhiLLL/SharpTimer/blob/master/SharpTimer.Bluetooth/SmartCubeBluetoothServices.cs

This is the most directly relevant independent Windows desktop source found. It opens a `BluetoothLEDevice` from the discovered address and requests uncached services. If broad discovery does not return a supported GAN service, it queries candidate GAN service UUIDs individually. It then discovers uncached characteristics, attaches a value-change handler, enables notifications through the CCCD and checks the returned communication status before startup requests. It releases owned resources after setup failures.

**Relevant difference:** our direct browser dependency stops when its broad `getPrimaryServices()` rejects; this implementation includes a targeted service-query path. That is an evidence-backed recovery design worth evaluating. Its existence does not prove it repairs our observed Windows failure, particularly if the physical link has already dropped.

Its explicit Gen4 name overrides cover GANicE2 and GANi4, not GANic4. Other GAN generation selection is based on advertised/discovered UUIDs. No reviewed source establishes a captured/tested i Carry 4 Windows connection. GPLv3 source was inspected for functional behavior only; no implementation code was incorporated.

### gan-to-keyboard: native Python / Bleak on Windows

- Repository and Windows support statement: https://github.com/ImNotGLaDOS/gan-to-keyboard
- Actual connection code: https://github.com/ImNotGLaDOS/gan-to-keyboard/blob/main/src/controller.py
- Generation/characteristic table: https://github.com/ImNotGLaDOS/gan-to-keyboard/blob/main/src/uuids_list.py

The controller selects console MTA, scans with Bleak, passes the scanned BLEDevice into BleakClient, connects and inspects characteristic UUIDs to select Gen2/3/4. It takes the address from that native device object, subscribes, then requests the initial state. This confirms that a native Bleak transport with GAN decoding is an established desktop approach rather than an invented protocol.

**Quality limit:** the README explicitly calls the project insufficiently tested. The reviewed Gen3 notification handler calls `_parce_moves_gen3`, while the defined helper is `_parce_move_gen3`. Consequently it is not an unqualified reliable drop-in reference for Gen3 readout. The model table lists i Carry 2 for Gen3, not i Carry 4. Do not recommend running its keyboard-emulation functionality merely to diagnose BLE.

### gan-node-sample: maintainer's native Node.js example

- Repository: https://github.com/afedotov/gan-node-sample
- Connection and initialization: https://github.com/afedotov/gan-node-sample/blob/main/index.js
- Dependencies: https://github.com/afedotov/gan-node-sample/blob/main/package.json

The GAN library maintainer supplies a browser-independent example using the `webbluetooth` native package, not `navigator.bluetooth` provided by a browser. It offers device selection, extracts the reversed address bytes from manufacturer data, connects through gan-web-bluetooth, subscribes to decoded events and requests hardware, facelets and battery. Its package file specifies gan-web-bluetooth 3.0.2 and webbluetooth 3.2.1 ranges.

**Relevance:** this is the closest reference to our JavaScript decoder architecture. Our bridge substitutes Bleak plus a narrow adapter for its native webbluetooth implementation. Similar decoded commands do not validate that adapter's Windows behavior or establish this model's compatibility. Moving between native packages is not justified as a confirmed fix by this example alone.

### Cube Libre: native Rust / btleplug

- Project: https://tangled.org/mayask.me/cube-libre/
- Public implementation commit: https://tangled.org/mayask.me/cube-libre/commit/54461c0d5263f4d22af7617e73db7a5d5fded1ba

The project documents native BLE and a desktop UI. Its published roadmap identifies Linux as the initial manual-test target; Windows/macOS still require builds and hardware validation. The referenced implementation is Gen4-focused. It is useful architecture context, not a verified Windows i Carry 4 solution, and was not used as the principal connection reference.

## Comparison with this app

Implementation update: this comparison led to a concrete change. Browser setup now queries the known GAN service UUIDs directly from the start, rather than first triggering the unfiltered query that fails in the user's trace. The native worker uses Bleak's supported-service filter with uncached Windows discovery. The decoder remains selected from actual returned services. No GPL implementation code was copied. The prior broad-discovery description in the original comparison is retained as the problem that motivated this change.

| Stage | Desktop references | Current app |
| --- | --- | --- |
| Native device discovery | Scanned device/address retained | Bleak worker retains scanned BLEDevice |
| Fixed cube address | Native address or manufacturer data | Owner's exact address pinned for GANic4_3730 |
| Windows async lifecycle | Native WinRT or Bleak console MTA | Bleak single event loop, explicit MTA setting |
| Attribute discovery | Native uncached queries; SharpTimer also queries individual GAN UUIDs | Browser: direct UUID queries; native: Bleak filtered, uncached discovery |
| Driver selection | Characteristic/service UUIDs | Maintained decoder selected by actual service UUID |
| Notifications and startup | Enable notifications, then initial state requests | Same order, plus decoded-state readiness gate |
| Physical i Carry 4 validation | Not established by reviewed desktop sources | Still not established |

## Engineering conclusion

There is existing desktop code to learn from. The useful new finding is the native Windows targeted-service discovery path, not another MAC workaround or arbitrary settling delay. The browser API call order matches the upstream GAN library, but source equivalence is weaker evidence than a successful hardware connection.

A justified next implementation comparison would isolate **broad discovery versus known-service discovery**, preserving a single owner, bounded setup, native status codes and cleanup. Bleak supports a `services` filter through its documented client API; on Windows this maps to service-specific native queries. Such a comparison can be prepared with fake clients first. It must not force a guessed generation or advertise itself as a confirmed repair before the actual service is observed.

The original trace does not contain Windows GATT communication status, ATT error code, discovered services or a firmware identifier. Therefore it cannot distinguish a browser/backend failure, Windows discovery/cache problem or a device/host interoperability issue. A phone connection does not isolate those laptop components. The root cause remains unresolved, and no hardware retry is requested by this report.
