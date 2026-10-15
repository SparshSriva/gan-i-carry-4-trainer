# Cube connection source audit

Reviewed October 14, 2026. Bluetooth being deliberately turned off after a failed test is not evidence for the preceding disconnect. The original failure occurred between GATT connection and service enumeration, before packet decryption. MAC or packet decoding problems must be distinguished from that phase.

## Primary references

- Maintainer reference app: https://github.com/afedotov/gan-cube-sample/blob/main/src/index.ts
- Maintainer connection implementation: https://github.com/afedotov/gan-web-bluetooth/blob/main/src/gan-smart-cube.ts
- Installed protocol implementation: gan-web-bluetooth 3.0.2, src/gan-cube-protocol.ts
- Independent behavior cross-check: https://github.com/cs0x7f/cstimer/blob/master/src/js/hardware/gancube.js
- Chromium reconnect pattern: https://googlechrome.github.io/samples/web-bluetooth/automatic-reconnect.html
- Native API contract: https://bleak.readthedocs.io/en/stable/api/client.html

Only functional behavior was compared with csTimer; no GPL implementation code is incorporated. GAN encryption and Gen2/3/4 drivers remain provided by the existing MIT dependency, not rewritten.

## Setup sequence

| Step | Established behavior | App status |
| --- | --- | --- |
| Device selection | Request GAN/MG/AiCube names with Gen2/3/4 optional services | Delegated to the installed library; native path scans/selects explicitly |
| Encryption address | Resolve MAC before deriving reverse-byte salt | Cached actual MAC, advertisement lookup, manual fallback; invalid cache ignored |
| GATT and services | Connect before discovering services; select protocol from UUID | Library setup retained; detected generation reported |
| Notifications | Obtain command/state characteristics and start notifications | Library connection owns subscription setup |
| Initial requests | Subscribe to events, then hardware, facelets, battery | Corrected to maintainer's order; startup errors no longer swallowed |
| Readiness | Establish initial cube state before interpreting turns | New shared handshake requires decoded 54-sticker facelets with nine of each face label |
| Failure cleanup | Release notification subscriptions and GATT connections | Manager closes failed/partial links, including failures before a connection object is returned |
| Reconnect | Reconnect the same selected device with exponential backoff | Chromium pattern adapted to a bounded three-attempt setup; waits 2/4 seconds on retries, no speculative settling delay |

The exact retry bound is an app policy, not a GAN protocol requirement. Permission failures are not retried. Initial connection and service enumeration are covered. After initialization, a disconnect ends the attempt; it does not silently resume a timed solve.

Both direct and native paths now use the same decoded-state readiness check. The bridge's HTTP response is withheld until server-side initialization succeeds. Browser startup independently verifies the delivered event stream. Failed decryption/no facelet response times out visibly; merely pairing or opening services cannot produce a ready state. The initial state remains diagnostic until a physically solved origin is selected; arbitrary snapshot hydration is still pending.

## Validation

Follow-up model-specific investigation: [i Carry 4 research](./ICARRY4_BLE_RESEARCH.md). The suite now has 40 checks, including encrypted **Gen3** service/command/notification/move coverage through the real dependency. The prior Gen4-only fixture did not adequately cover the model reported by Twysty as Gen3. A separate [BLE connection lab](../tools/ble-test/README.md) runs on port 5174 using the library directly. Main-app connection logs now export timestamped setup observations and errors.

39 automated checks cover the application regressions, reconnect/restoration and permission handling, partial-link cleanup, failed startup writes, decoded-state timeout/validation, encrypted Gen4 solved-facelet packets and ordered R/U move packets through the real GAN decoder, and bridge ownership/origin/command restrictions. Bridge HTTP handler tests run in process by default; CUBE_LIVE_HTTP=1 enables real loopback integration where permitted. The revised readiness flow also passed the real loopback HTTP integration test using simulated BLE. Lint, TypeScript, and the production build passed. These fixtures verify protocol wiring, not an actual i Carry 4 connection.

The upstream 3.0.2 README does not explicitly list i Carry 4. Generation support is therefore based on discovered service UUIDs, not inferred from its product name. A physical test must confirm its services, firmware, decrypted snapshot, live turns, reset, and disconnect cleanup. Native Windows runtime/scanning was tested; Linux/macOS acceptance and physical compatibility remain pending. Persistent setup-stage errors provide the needed next-test evidence without attributing a failure to battery, timing, or another application without evidence.
