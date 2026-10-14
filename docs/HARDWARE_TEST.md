# First GAN i Carry 4 hardware test

Use desktop Chrome or Edge at the local app URL. The in-app browser may not expose Web Bluetooth. Keep the cube physically solved before connecting. This procedure verifies a controlled outer-face attempt; normal solves involving untracked regrips are not yet accepted as reliable reconstructions.

1. Wake the cube and select Connect Cube. Choose the GAN device in the browser picker. If MAC fallback appears, enter the cube's actual Bluetooth MAC. A cached address is specific to that device.
2. Check the connected name/battery and state banner. An unsolved report is diagnostic, not imported into the viewer. Solve the cube physically first; Sync Solved resets the cube's internal reference and the app's logical origin, not its actual stickers.
3. Set White up / Green front for the first test, then Sync Solved. Open Solve Timer and select Hardware test (or create that group). Simulator must be off; connecting normally switches it off.
4. Paste `R U`, choose Use scramble, and perform R then U while maintaining the calibrated grip. Check the banner's raw/logical move and packet serial. The guided setup should become Ready.
5. Perform U' then R'. The timer should save a solved, two-event GAN reconstruction into that group. Open the saved record and verify replay. Export JSON and check source, group ID, startingGrip, raw/logical moves, and timestamps.
6. Repeat with `R2 U2` to check two quarter-turn packets per half turn and guided corrections. Then use the trainer's primary Sune alternate, which has only outer-face turns.
7. Disconnect during a running timer: it should save DNF. Reconnect from a physically solved cube, Sync Solved, and repeat the short test. Confirm no duplicated or stale callbacks.

A duplicate serial is ignored. A serial gap, out-of-order packet, or recovered move without a reliable host timestamp pauses hardware practice and interrupts an active timer as DNF. Recover by physically solving and Sync Solved. Failed reset commands stay visible and require reconnect. Report the banner text and the last raw/logical move if this occurs.

Do not test slice/wide algorithms or regrip during the first acceptance run. A manually selected starting grip is supported; automatic orientation tracking, camera estimation, arbitrary FACELETS hydration, and hardware composite-turn interpretation remain pending. Timing currently uses host timestamps; cube-clock regression is not implemented. Battery or hardware requests that fail are logged and may leave fields unavailable. Software tests passed; physical validation has not yet been performed.

## Finding the Bluetooth MAC address

On Windows, open chrome://bluetooth-internals/#devices (or edge://bluetooth-internals/#devices), scan while the cube is awake, and copy its Address into the fallback prompt. The app first uses a per-device cached address, then lets the library try advertisement-based discovery, then asks for manual entry. Chrome advertisement support may require chrome://flags/#enable-experimental-web-platform-features and a browser relaunch. These experimental APIs depend on browser/platform support. The maintainer’s guide also describes Android nRF Connect scanning: https://gist.github.com/afedotov/52057533a8b27a0277598160c384ae71. A Windows Bluetooth diagnostic address can be used; the same page on macOS may show a substituted address that will not work. Packaging and CubeStation settings are not assumed to expose this address.

