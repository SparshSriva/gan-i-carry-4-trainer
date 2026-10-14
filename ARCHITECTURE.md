# GAN i4 Trainer: architecture and milestone status

Evaluated and updated October 14, 2026.

## Current implementation

React 18 + TypeScript + Vite + Tailwind. `useTrainerState` owns the practice loop. A cubing.js KPuzzle pattern receives every setup and execution move. Attempts finish only when that pattern is solved, ignoring whole-cube and center orientation. A move count alone cannot finish an attempt. Recognition starts on the final setup turn; execution starts on the first non-rotation move. TPS uses received non-rotation moves, and deltas describe consecutive physical turns. Double turns received as one simulator event count as one turn; hardware quarter-turn packets count individually.

`ScrambleAssistant` tracks exact setup tokens, partial half turns, and a stack of inverse corrections. A partial half turn persists across pauses and mistakes. Native double-turn simulator events and two same-direction hardware quarters both complete a half turn. Opposite quarters cancel. The correction stack also accepts quarter turns for a double-turn correction.

`twisty-player` retains its required grid host display; forcing block display collapses the size-contained internal wrapper to zero height. `Twisty3DView` displays the complete received move history at its end position. The default dual view pairs 3D with the Voxygen-style six-face projection and nine rails. Voxygen 2D opens the full projection; Facelet Net and Last Layer remain separate views. The rail renderer consumes full move history, rebuilds after resets or remounts, and handles face, slice, wide, and rotation notation through the independent geometric model in `railMoves.ts`. Its face-turn buttons feed the trainer once and are enabled during keyboard practice. Fast input is caught up without a long animation backlog.

`ganBluetooth` delegates protocol handling to the installed `gan-web-bluetooth` package. The App forwards events through a ref to current trainer actions, avoiding connection-time closures. MAC addresses are cached per device rather than reused across devices. Connecting disables keyboard simulation. The i Carry has no orientation sensor. `gripOrientation.ts` defines 24 up/front frames, derives a display rotation, and maps GAN outer-face events into the selected solving frame before the trainer or timer consumes them. The saved frame locks during attempts. Changing physical grip during a solve is not automatically detected.

Cases, attempt history (up to 2,000 entries), and XP persist in localStorage. Reward calculation is pure and returns an immediate event; it does not mutate values inside React state updaters. The library supports search, learning status changes, and launching practice. Analytics supports per-case and last-seven-days filters, recognition/execution charts, move pause breakdowns, and recent attempts. Practice filters define the weighted queue when Random Next is used and remain in effect for subsequent Next Case actions.

## Milestones

| Milestone | Status | Remaining work |
| --- | --- | --- |
| 1: architecture and simulator | Implemented, simulator loop browser-tested | Audit case names/algorithms against standard case definitions; broaden accessibility |
| 2: scramble assistant and move parser | Partial | Hardware slice/wide composite move decoding, automatic regrip frame tracking, arbitrary-front detection, correction arrows |
| 3: GAN Bluetooth | Adapter integrated; physical device unverified | Initial FACELETS hydration, reconnect/lost-packet behavior, physical calibration verification, real i Carry 4 acceptance test |
| 4: telemetry and learning buckets | Core splits, storage, weighted queues, library, analytics implemented | Full 57 OLL and 41 F2L catalog, multi-status/manual queue selection, random AUF, custom algorithms, backup/export |

Simulator slice/wide/rotation notation works through cubing.js. Hardware sensors only send outer face turns: the composite parser is not implemented, so hardware practice of cases using slices, wide moves, or rotations is not yet supported. FACELETS is exposed by the Bluetooth adapter but not hydrated into the trainer. Start with a physically solved cube and select the matching up/front grip before selecting a case. Sync Solved resets the logical origin; it cannot solve the physical cube.

The current OLL starter catalog contains duplicate/mislabeled candidates inherited from the initial implementation. Inverse/algorithm identity tests prove round-trip correctness, not standard case classification. Do not claim the full catalog is complete or audited.

## Verification

- `npm test`: source-level regression tests for half turns, cancellation, nested recovery, double-turn correction, library inverse round trips, non-solved arbitrary move sequences, weighted filters, deterministic XP, geometric rail moves and notation decompositions, and orientation normalization/persistence (25 tests).
- `npm run build`: TypeScript and production Vite bundle.
- `npm run lint`: ESLint, including the active Voxygen component.
- Browser acceptance: Sune setup, repeated wrong execution turns staying in EXECUTING, recovery followed by solved completion, library search, populated analytics, repeated rail turns, single-event rail controls, mouse dragging, roll adjustment, keyboard view alignment without new puzzle moves, and alignment persistence across view changes.
- Physical Bluetooth tests require a GAN cube and a Web Bluetooth-capable Chromium browser.

## Public behavior references

Feature inspiration is limited to public descriptions and this project's specification. No official app binaries, proprietary code, assets, or network protocols were extracted.

- GAN describes tailored training in its smart-cubing ecosystem: https://www.gancube.com/pages/gan-smartcubing-ecosystem
- GAN's published CubeStation listing describes teaching, training, and time trials: https://apps.apple.com/us/app/cubestation-new/id6473158674

These references motivate local practice and performance review; this implementation does not claim feature parity with CubeStation.

## Viewing orientation and future camera tracking

Manual alignment is implemented for both the full 3D viewer and the 3D half of Dual View. Drag to orbit, use Turn/Tilt/Roll sliders for precise alignment, and Reset view for the default perspective. The pose persists independently of case state and move history. Clicking or dragging the 3D viewer does not inject puzzle moves. Viewing angles remain separate from the solving frame. Drag release can snap the selected up/front frame when idle; sensor face events are then remapped into that frame. During an active attempt, the frame is locked and viewing changes cannot alter the logical move stream.

`CubeOrientation` in `utils/cubeOrientation.ts` represents the displayed yaw, pitch, and roll in degrees. A pointer-capture surface handles mouse/touch dragging and keyboard arrows independently of puzzle turns. Requested orbit coordinates are sent to TwistyPlayer, and its resolved coordinates flow back to the saved pose; roll rotates the rendered viewing plane. This is a manual view adapter, not gyroscope emulation.

Planned computer-vision work: opt-in camera capture; sticker/face identification; calibrated cube-to-camera pose estimation (quaternion or rotation matrix); confidence thresholds and temporal smoothing; handling occlusion and tracking loss; and an adapter from the calibrated pose to the viewer. Keep pose estimates separate from BLE face turns. The static up/front mapping provides a basis for algorithms relative to the user's grip; continuous regrip tracking will require updates based on calibrated pose estimates. Validate camera privacy, calibration, latency, and orientation conventions before enabling automatic updates. No camera capture or computer-vision tracking is implemented or enabled yet.

See [ROADMAP.md](./ROADMAP.md) for ordered follow-up work and camera acceptance criteria.

## General solve sessions and recording

`SolveSession` is an independent, ref-backed state machine: scrambling → ready → solving → review. It receives logical moves in the calibrated grip, tracks a KPuzzle pattern, and uses `ScrambleAssistant` for guided setup. First non-rotation solution input starts timing; solved state finishes a tracked attempt. Before-first-turn rotations are retained for reconstruction. Manual timing records unverified completion without inventing move events. Cancellation during a solve creates a DNF; pre-solve cancellation records no completed attempt.

`useSolveTimer` owns live updates and local history in the App, so persistence survives view changes. UI navigation, input-mode changes, disconnects, and sync interrupt active solves. A record snapshots the starting grip, target scramble, setup method, actual setup events, solution events, input source, timestamps, duration, inspection interval, and completion status. GAN events retain both raw sensor notation and remapped logical notation. Last 1,000 records persist under `ganicv4_solves_v1`. Replay applies the saved grip rotation and scramble, then a prefix of the solution. JSON export remains local until the user chooses to share it.

See [SOLVE_RECORDS.md](./docs/SOLVE_RECORDS.md) for the schema and future analysis boundaries. This does not yet implement CFOP phase detection, AI recommendations, camera tracking, or automatic regrip handling. Generated scrambles are clearly labeled random-turn practice scrambles; competition random-state generation remains future work.

Browser acceptance also verified snap-on-release to white-up/red-front, frame locking, a tracked R U / U' R' solve, manual timing, replay, downloaded JSON content, and history reload. Regression tests cover every frame mapping, timer reconstruction and timing, DNF/manual behavior, scramble validation, and rolling averages.
