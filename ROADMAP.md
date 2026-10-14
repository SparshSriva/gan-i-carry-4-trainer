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
- Verify production build, lint, 18 regression tests, and the documented browser acceptance flows.

## Next: physical cube reliability

1. Test discovery, MAC fallback, battery events, move ordering, disconnects, and solved reset on a real GAN i Carry 4.
2. Hydrate initial FACELETS into the logical puzzle state and every viewer. Define how to reconcile snapshots with moves already received.
3. Detect dropped/duplicated/out-of-order packets and interrupt affected attempts rather than recording unreliable metrics.
4. Decode slice/wide composite sensor turns and implement explicit orientation-frame mapping. Simulator notation support does not imply hardware support.

Acceptance: hardware and virtual state agree across a connection, a full practice loop, recovery, and a reconnect; unsupported states have clear recovery guidance.

## Next: training catalog and practice workflow

Audit standard case classification before expanding to all 57 OLL and 41 F2L cases. Add multiple learning-status filters, manual queue selection, random AUF, custom algorithm editing, and local backup/export. Distinguish physical-turn TPS from algorithm metrics consistently across simulator and hardware input.

## Long term: camera orientation in place of a gyroscope

Goal: estimate the physical cube's orientation from a camera and orient the 3D display to match the user's grip while the GAN sensors continue supplying face turns.

1. Add opt-in camera access with explicit start/stop controls and a visible capture state.
2. Detect cube faces/stickers under varied lighting and distinguish physical pose from sticker changes caused by face turns.
3. Calibrate camera, cube color scheme, and the logical orientation used by the Bluetooth state model.
4. Estimate a cube-to-camera quaternion or rotation matrix. Apply confidence gates and temporal smoothing.
5. Adapt the calibrated pose to the viewer. Keep manual alignment and reset available as fallback.
6. Handle hands covering the cube, motion blur, and tracking loss. Hold the last reliable pose and make loss of tracking visible.
7. Implement a separate logical frame mapping where algorithms must follow the user's holding orientation. Updating the displayed view alone does not provide this mapping.

Acceptance: the display follows all three orientation axes without injecting puzzle moves or corrupting attempt timing; latency and stability are measured on recorded scenarios; capture stops when requested; tracking failure preserves manual operation. Establish concrete performance targets during the prototype phase.

No camera capture, pose estimation, or automatic frame remapping is currently implemented.
