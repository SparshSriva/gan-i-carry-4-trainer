# Native Bluetooth bridge

The bridge moves BLE scanning, address discovery, and GATT I/O out of the browser. Python 3.10+ and pinned Bleak 3.0.1 use the platform BLE backend (WinRT on Windows, BlueZ on Linux, CoreBluetooth on macOS). Node reuses gan-web-bluetooth 3.0.2 through a narrow GATT adapter; encryption and Gen2/3/4 decoding remain in the installed library. No second protocol implementation is shipped.

## Run

```
npm run setup:bridge
npm run bridge
```

Keep the bridge terminal running alongside `npm run dev` or `npm run preview`. The setup command creates an ignored project-local `.runtime/ble` virtual environment and installs Bleak from PyPI. Set CUBE_PYTHON for the setup interpreter or CUBE_BRIDGE_PYTHON to an existing runtime interpreter. No administrator rights, browser flags, or browser Bluetooth API are required by this transport. The local computer still needs a working BLE adapter and any platform Bluetooth permissions. Do not connect the same cube through Edge/CubeStation and the bridge simultaneously.

In the app select **Local bridge**, then **Connect Cube**. A native scan lists GAN/MG/AiCube devices; select your cube explicitly. Manufacturer advertisements supply the encryption MAC when available, with an actual OS MAC fallback on Windows/Linux. macOS uses UUID device identifiers; these cannot be used as encryption MACs. Manual MAC entry remains available if manufacturer data does not supply it. Native service discovery determines protocol support, not the product marketing name.

The browser uses same-origin HTTP through Vite's `/api/bridge` proxy. The bridge listens on 127.0.0.1:2015 only, checks Host/Origin, requires a custom request header and a per-connection owner token, exposes only the four existing cube commands, and provides no arbitrary GATT endpoint. Device IDs/addresses stay local. A second client cannot take over a connection. Polling runs every 100 ms; a 512-event sequence buffer detects missed delivery and a 15-second heartbeat releases abandoned clients. Sleep/throttling/network loss can interrupt a solve. Do not expose this service on a public interface. Default allowed app origins are localhost/127.0.0.1 ports 5173 and 4173; CUBE_BRIDGE_ORIGINS can explicitly configure other local app origins.

Both transports feed the same move-integrity guard, calibrated frame mapping, trainer, and timer. Native decoder monotonic timestamps are converted to epoch milliseconds on the server; direct Web Bluetooth timestamps are converted in the adapter. Cube-clock regression and camera/regrip tracking remain pending. A failed native scan/connection produces an error rather than silently switching transports. This does not fix a sleeping/low-battery cube or a competing connection.

## Validation and limits

Loopback integration checks use the real GAN decoder with a simulated GATT transport and an encrypted Gen4 battery packet. They verify scan/selection, encrypted command writes, decoded event delivery, owner-token enforcement, foreign-origin rejection, disconnect cleanup, and refusal of arbitrary commands. This is protocol/transport integration evidence, not a physical cube acceptance result. Use HARDWARE_TEST.md from a physically solved cube for move/reset/reconnect verification.

Windows runtime installation, bridge startup, and a completed native BLE scan are verified locally. That scan returned no advertising GAN device, so no physical cube connection is claimed. Linux/macOS paths use Bleak's supported backends but have not been tested here. Browser-independent means any browser capable of fetching the locally hosted app; remotely hosted deployments, mobile-browser-to-desktop bridging, and packaging as a desktop service are not provided. The first release requires two local processes. Initial snapshot hydration, physical regrip tracking, and hardware slice/wide interpretation remain existing limitations.

References: https://bleak.readthedocs.io/en/stable/api/scanner.html, https://bleak.readthedocs.io/en/stable/api/client.html, https://github.com/afedotov/gan-web-bluetooth.

The shared startup handshake follows hardware → facelets → battery and requires a valid decoded snapshot before readiness. Both partial and completed native links are closed on failed setup. Latest source comparison and test boundaries: [CONNECTION_AUDIT.md](./CONNECTION_AUDIT.md).
