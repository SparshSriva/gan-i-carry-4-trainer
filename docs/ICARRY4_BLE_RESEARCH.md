# GAN i Carry 4 BLE investigation

**Current status: root cause unresolved; hardware testing on hold at the owner's request.** The fixed owner-supplied MAC for `GANic4_3730` is now configured in `src/utils/knownCube.mjs` and used by the trainer, lab and native bridge. Cache/advertisement lookup and manual prompts are bypassed for this cube. The observed failure is after a successful GATT connect and before service discovery completes. MAC configuration resolves repeated entry only; it is not represented as a fix for that failure. Do not initiate further scans, connects, resets or pairing changes without a new user instruction authorizing the hardware test.

Reviewed October 14, 2026. No successful connection or packet capture from the user's cube exists yet. Bluetooth was disabled **after** the failed attempt; that does not explain the preceding failure.

## Evidence

**Implemented follow-up:** the shared browser setup now substitutes targeted `getPrimaryService(uuid)` queries for unfiltered enumeration. The lab uses that same adapter and no longer re-enumerates all services after readiness. Native Bleak receives a supported-service filter plus uncached Windows settings; inspection of the installed backend confirms this selects `get_gatt_services_for_uuid_with_cache_mode_async`. The application reconnect/backoff loop was removed. Only an absent profile on a still-connected link permits another UUID query. Offline integration proves the real upstream driver reaches decoded Gen3 state without an unfiltered query; it does not prove the physical disconnect repaired. Earlier sections describing generic retries or broad discovery are historical. Hardware tests remain on hold.

The owner's clarification is that CubeStation works on a **phone**, not that a custom laptop app previously received turns. See the [desktop implementation source comparison](./LAPTOP_BLE_IMPLEMENTATIONS.md) for native Windows C#/WinRT, Python/Bleak and Node.js implementations. The strongest newly identified functional difference is SharpTimer's targeted GAN service-query fallback after general enumeration fails. It is a candidate recovery design, not an established fix for this cube's failure.

- [Twysty support](https://twysty.vercel.app/support) has a search-indexed version explicitly describing i Carry 4 as **Gen3**, with moves, facelets and battery, without gyro. Direct fetching also returned an older generic version. This is a reported implementation claim, not captured proof for every firmware revision.
- [acubemy's FAQ](https://acubemy.com/faq) lists i Carry 4 (2026) separately from GAN i4. It does not publish the protocol implementation. Product number 4 cannot select a GAN protocol driver.
- The installed MIT [gan-web-bluetooth](https://github.com/afedotov/gan-web-bluetooth) 3.0.2 has Gen2/3/4 drivers. Its documented Gen3 model is i Carry 2; its README does not explicitly establish i Carry 4 compatibility. It selects the driver from discovered service UUIDs.
- Reviewed the maintainer's [sample](https://github.com/afedotov/gan-cube-sample/blob/main/src/index.ts), the maintained [MIT fork](https://github.com/poliva/smartcube-web-bluetooth), and functional behavior in [csTimer](https://github.com/cs0x7f/cstimer/blob/master/src/js/hardware/gancube.js). No csTimer code was copied. No public i Carry 4 capture or model-specific explanation for this pre-service Windows failure was found.
- [GAN's product page](https://www.gancube.com/products/gan-i-carry-4-smart-cube) establishes the product identity; no public vendor GATT specification was located.

The previous Gen4-only fixture was insufficient validation for a model reported as Gen3. New Gen3 coverage corrects that test gap; it does not establish that changing drivers fixes the original link failure.

## Gen3 contract from the installed source

| Purpose | UUID / decoded bytes |
| --- | --- |
| Service | `8653000a-43e6-47b7-9cb0-5fc21d4ae340` |
| Command write | `8653000c-43e6-47b7-9cb0-5fc21d4ae340` |
| State notify | `8653000b-43e6-47b7-9cb0-5fc21d4ae340` |
| Hardware request | `68 04`, zero-padded to 16 bytes before encryption |
| Facelets request | `68 01`, zero-padded to 16 bytes before encryption |
| Battery request | `68 07`, zero-padded to 16 bytes before encryption |
| Response framing | Decrypted magic `55`, type, data length |

AES salt comes from the actual cube MAC, reversing its six bytes and adding modulo 255 to base key/IV. Gen3/4 encryption matches, but message layouts differ. For messages longer than 16 bytes, first and last 16-byte windows are encrypted separately and may overlap. Naive whole-buffer CBC is incorrect for a 20-byte packet.

A model name or browser device ID is not a MAC. The maintainer's [MAC FAQ](https://gist.github.com/afedotov/52057533a8b27a0277598160c384ae71) explains advertisement/manual methods and platform differences. There is no universal browser-only address bypass. The Bleak bridge obtains native Bluetooth access where browser JavaScript cannot.

## Reference sequence

1. User selects the device with access to GAN optional services.
2. Resolve an actual MAC from provided/cached input or manufacturer advertisements.
3. Await `device.gatt.connect()`, enumerate services and choose the matching driver.
4. Obtain command/state characteristics. Attach the handler and await notifications.
5. Subscribe to decoded events; request hardware → facelets → battery sequentially, matching the maintainer's sample.
6. Require a decoded initial snapshot. Gen3 ignores MOVE events until FACELETS establishes the serial baseline.
7. Track serials/timestamps and stop tracking on disconnect; do not silently continue a timed solve across gaps.

The main app adds shared readiness validation and bounded reconnects adapted from [Chromium's example](https://googlechrome.github.io/samples/web-bluetooth/automatic-reconnect.html). Its 2/4-second delays are app policy, not a GAN requirement. The separate [BLE lab](../tools/ble-test/README.md) calls the upstream library directly without those wrappers.

## What the error establishes

Follow-up hardware log: the device advertises as `GANic4_3730`. The first lab attempt failed on unsupported browser `prompt()` before GATT setup; the lab now uses inline MAC guidance. With an explicit MAC, a later attempt emitted a disconnect about 11.4 seconds after selection and rejected service retrieval. This reproduces the issue outside the trainer. The old log did not observe the resolution of `gatt.connect()` separately, so it cannot show whether connect returned a live link or discovery subsequently lost it. Transparent call tracing and an explicit native bridge comparison are now available in the lab. A later UI observation showed a pending reference-path attempt with GATT marked connected but no driver/readout yet; that attempt was not interrupted by the agent.

[Microsoft's GATT client guidance](https://learn.microsoft.com/en-us/windows/apps/develop/devices-sensors/gatt-client) distinguishes creating a device reference, establishing connectivity and discovering services; Windows operations may wait on queued requests. [Chromium's Web Bluetooth guide](https://developer.chrome.com/docs/capabilities/bluetooth) also treats connect and service discovery as separate awaited operations. These sources justify tracing the boundary; they do not establish a Windows timeout as this cube's root cause.

The subsequent test-server restart to activate the proxy refreshed open lab pages, ending the pending browser attempt. The updated lab was left idle. Native `/status` returned `connected=false, busy=false` through the lab's proxy. No agent-initiated hardware scan or connection occurred. The updated suite has 42 checks, including trace transparency and the connect-success/service-disconnect distinction. Lab build, lint and TypeScript pass.

`GATT Server is disconnected. Cannot retrieve services` places the failure at service discovery, before packet-driver selection/decryption. A wrong MAC can prevent later decoding; this error alone does not demonstrate wrong MAC, unsupported packets, low battery, another app or insufficient delay.

Next-test evidence: advertised name, connected state, service UUIDs if reached, exact error and elapsed time. The main app now exports setup observations; the independent lab exports decoded events/errors. Failure in both narrows investigation toward library/browser/OS/device boundaries; lab success with trainer failure points toward app integration. Neither alone identifies the specific cause.

The native bridge uses [Bleak's client API](https://bleak.readthedocs.io/en/stable/api/client.html) and the same decoder. It can isolate Web Bluetooth behavior but cannot repair an unknown firmware protocol mismatch by itself. A speculative firmware change or MAC brute force is not justified by the available evidence.

## Validation and remaining acceptance

### Observed connect/discovery boundary and native comparison

The subsequent user trace separates the calls: `gatt.connect()` resolved in 27 ms with both connected flags true; `getPrimaryServices()` then rejected after 8,323 ms following a disconnect. This establishes a connection/service-discovery failure, not a decoded-packet failure. The user has supplied the matching MAC; entering it repeatedly cannot fix this stage.

A native five-second scan found no GAN advertisements. Its timestamps (04:43:37–42 UTC) overlapped a browser picker (04:43:33–46 UTC), so that result is not an isolated comparison. Windows read-only inspection confirmed a working Realtek BLE adapter with radio state ON. A single documented `FromBluetoothAddressAsync` probe returned no device reference and released its resources; no service UUIDs or hardware responses were obtained. This does not disprove the user's pairing observation or establish a hardware defect.

The [GAN maintainer's native example](https://github.com/afedotov/gan-node-sample/blob/main/index.js) reads the advertisement MAC, subscribes to the decoder and uses the same request sequence. Its transport is webbluetooth; our transport remains Bleak, so the example is a behavioral cross-check, not validation of our native adapter. [Bleak's client documentation](https://bleak.readthedocs.io/en/stable/api/client.html) warns that scan/connection concurrency depends on adapter hardware and recommends passing a scanned BLEDevice instead of triggering another implicit scan.

The lab now holds a Web Lock across a connection, or for the duration of a native scan, rejecting overlapping attempts in updated lab tabs on the same origin. This cannot exclude another app, another port, or a previously loaded lab version. The native worker continues using one asyncio loop and scanned BLEDevice objects; it now explicitly selects uncached Windows service discovery, checks session state, cleans failed/ cancelled partial clients, ignores obsolete-generation disconnect/notification callbacks, and reports operation/error type. These are lifecycle corrections and a documented cache policy, not a proven repair for the physical failure. [Bleak documents uncached service options](https://bleak.readthedocs.io/en/stable/api/args.html#winrt-backend-arguments) and [console MTA requirements](https://bleak.readthedocs.io/en/stable/troubleshooting.html#windows-bugs).

43 JavaScript checks and three native lifecycle unit tests pass, with lab build/lint passing. Native tests use fake clients and access no hardware. Run them after bridge setup with `.runtime/ble/Scripts/python.exe -m unittest discover -s tests -p test_ble_worker.py` on Windows. A coordinated awake-cube test is still required; these checks do not establish reliable hardware operation.

The new synthetic Gen3 test exercises actual service selection, allowed picker service, notification-before-write order, exact encrypted startup requests, overlapping-window encrypted facelets, move suppression before initial state, ordered R/U' events, battery, reset and disconnect through the real installed decoder/native adapter. Layouts come from source, not an i Carry 4 capture. Gen4 coverage remains.

40 checks, lint, TypeScript, main build and standalone build pass. The lab was visually checked idle and rejects malformed MAC before Bluetooth access. No hardware scan/connection was initiated.

Still required: this cube's actual services/characteristics, hardware/firmware, decrypted snapshot, slow R/U/U' turns, longer sequences, battery and disconnect behavior. Native Linux/macOS acceptance and arbitrary starting-state hydration remain separate unverified work. Start trainer sessions physically solved until hydration exists.
