# Development roadmap

Updated October 14, 2026. Current implementation and milestone status are recorded in [ARCHITECTURE.md](./ARCHITECTURE.md).

## Completed in this iteration

- Validate completion using cube state instead of a turn count.
- Preserve half-turn progress, cancellation, and nested scramble corrections.
- Render actual move history in 3D, rail projection, cube net, and last-layer views.
- Restore the Voxygen-style rail projection with face/slice/wide/rotation support and reset-safe history consumption.
- Provide independent, persistent 3D view alignment through drag, keyboard, and Turn/Tilt/Roll controls.
- Replace Library and Analytics placeholders with searchable cases and local practice history.
- Respect weighted practice filters, hide case identity during blind recognition, and calculate XP deterministically.
- Keep Bluetooth callbacks current and cache MAC addresses per device.
- Verify production build, lint, 39 regression tests, and the documented browser acceptance flows.

## Next: physical cube reliability

1. Test discovery, MAC fallback, battery events, move ordering, disconnects, and solved reset on a real GAN i Carry 4.
2. Hydrate initial FACELETS into the logical puzzle state and every viewer. Define how to reconcile snapshots with moves already received.
3. Detect dropped/duplicated/out-of-order packets and interrupt affected attempts rather than recording unreliable metrics.
4. Decode slice/wide composite sensor turns and track logical frame changes during regrips. Static starting-frame mapping is implemented. Simulator notation support does not imply hardware support.

Acceptance: hardware and virtual state agree across a connection, a full practice loop, recovery, and a reconnect; unsupported states have clear recovery guidance.

## Next: training catalog and practice workflow

Complete an independent standard-case classification audit of the sourced 41 F2L / 57 OLL / 21 PLL catalog. Grouped browsing, 272 alternates, custom alternates, preferred variants, manual sessions, balanced cycles, and adaptive variant weighting are implemented. Next: random AUF, multi-status selection, session backup/import, algorithm annotations, and explicit hardware-compatible practice. Distinguish physical-turn TPS from algorithm metrics consistently across simulator and hardware input.

## Long term: camera orientation in place of a gyroscope

Goal: estimate the physical cube's orientation from a camera and orient the 3D display to match the user's grip while the GAN sensors continue supplying face turns.

1. Add opt-in camera access with explicit start/stop controls and a visible capture state.
2. Detect cube faces/stickers under varied lighting and distinguish physical pose from sticker changes caused by face turns.
3. Calibrate camera, cube color scheme, and the logical orientation used by the Bluetooth state model.
4. Estimate a cube-to-camera quaternion or rotation matrix. Apply confidence gates and temporal smoothing.
5. Adapt the calibrated pose to the viewer. Keep manual alignment and reset available as fallback.
6. Handle hands covering the cube, motion blur, and tracking loss. Hold the last reliable pose and make loss of tracking visible.
7. Extend the static starting-frame map to follow continuous changes in the user’s holding orientation. Updating the displayed view alone does not provide this mapping.

Acceptance: the display follows all three orientation axes without injecting puzzle moves or corrupting attempt timing; latency and stability are measured on recorded scenarios; capture stops when requested; tracking failure preserves manual operation. Establish concrete performance targets during the prototype phase.

Static up/front frame remapping is implemented and tested for all 24 orientations. No camera capture, pose estimation, or automatic regrip tracking is currently implemented.

## Added after trainer comparison

The general Solve Timer now saves scramble/solution reconstructions, supports local replay/JSON export, and displays best/mean/ao5/ao12. Snapped starting grip drives GAN face mapping. Public comparison and next priorities are recorded in [TRAINER_COMPARISON.md](./docs/TRAINER_COMPARISON.md).

Official TNoodle-WCA random-state generation is implemented through the local signed runtime. Next timer work: +2/DNF editing with an audit trail, optional inspection rules, solution annotations, import validation, and CFOP/fluency splits computed from saved move/state sequences. Future AI assistance should operate on a versioned reconstruction with clear input provenance and request user consent before transmitting records to an external service.

Named timer groups and group-specific averages are implemented. Circular packet serial checks, duplicate suppression, untimed recovery detection, view/source input isolation, and visible hardware diagnostics are implemented. Real-device acceptance and initial state hydration remain outstanding; see docs/HARDWARE_TEST.md.

Native local BLE bridge implemented as an alternative to Web Bluetooth. Next: real-device native/direct comparison, measured transport latency, Linux/macOS acceptance, packaging/service lifecycle, and reconciling FACELETS with the logical model.

Connection initialization was audited against the maintainer sample, csTimer behavior, Chromium reconnect example and Bleak API. See [connection audit](./docs/CONNECTION_AUDIT.md). Readiness now requires decoded facelets; failed setup closes partial links.
