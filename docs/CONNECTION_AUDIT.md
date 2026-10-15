# Cube connection source audit

October 15 update: targeted discovery is implemented in the trainer, lab and native bridge and verified offline. Physical tests remain on hold.

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
| GATT and services | Connect before discovering services; select protocol from UUID | Targeted queries for actual Gen3/4/2 service UUIDs replace unfiltered enumeration; detected generation reported |
| Notifications | Obtain command/state characteristics and start notifications | Library connection owns subscription setup |
| Initial requests | Subscribe to events, then hardware, facelets, battery | Corrected to maintainer's order; startup errors no longer swallowed |
| Readiness | Establish initial cube state before interpreting turns | New shared handshake requires decoded 54-sticker facelets with nine of each face label |
| Failure cleanup | Release notification subscriptions and GATT connections | Manager closes failed/partial links, including failures before a connection object is returned |
| Reconnect | Failure ends the explicit attempt | Automatic reconnect/backoff removed; absent profiles may be queried on the same live link |

The current path makes one explicit connection attempt. Browser discovery queries `getPrimaryService(uuid)` for Gen3, then Gen4/2 only if the preceding profile returns NotFoundError and the link remains connected. Network, permission and disconnect errors stop immediately. Native Bleak receives the same three UUIDs via its documented services filter and requests uncached Windows attributes. It still has a 25-second connect/discovery deadline and up to five seconds for failure cleanup; backend attribute retries can occur within that bound. No application-level reconnect loop remains.

Both direct and native paths now use the same decoded-state readiness check. The bridge's HTTP response is withheld until server-side initialization succeeds. Browser startup independently verifies the delivered event stream. Failed decryption/no facelet response times out visibly; merely pairing or opening services cannot produce a ready state. The initial state remains diagnostic until a physically solved origin is selected; arbitrary snapshot hydration is still pending.

## Validation

Follow-up model-specific investigation: [i Carry 4 research](./ICARRY4_BLE_RESEARCH.md). The suite now has 46 JavaScript checks and three native lifecycle checks, including the actual upstream browser bootstrap reaching a decoded Gen3 snapshot while unfiltered enumeration is configured to fail. Coverage includes live-link profile fallback, stopped-link/permission failures, UUID mismatch rejection and original-method restoration. The lab and trainer share the targeted discovery implementation. The old Gen4-only fixture and generic reconnect mitigation are superseded.

The remaining regression checks cover partial-link cleanup, startup write failures, decoded-state timeout/validation, encrypted Gen3/4 snapshots and turns, and bridge ownership/origin/command restrictions. Native tests use fake clients and check the supported-service filter plus uncached Windows discovery. Lint, TypeScript and both production builds pass. These fixtures verify wiring and failure handling, not an actual i Carry 4 connection. No physical test was run for this change.

The upstream 3.0.2 README does not explicitly list i Carry 4. Generation support is therefore based on discovered service UUIDs, not inferred from its product name. A physical test must confirm its services, firmware, decrypted snapshot, live turns, reset, and disconnect cleanup. Native Windows runtime/scanning was tested; Linux/macOS acceptance and physical compatibility remain pending. Persistent setup-stage errors provide the needed next-test evidence without attributing a failure to battery, timing, or another application without evidence.
