# GAN i4 Algorithm Trainer

Browser-based algorithm practice with guided scramble recovery, a keyboard simulator, GAN Web Bluetooth integration, a searchable algorithm library, and local practice analytics.

## Run

```powershell
npm install
npm run dev
```

Install Java 17+ first. The launcher downloads the pinned official TNoodle-WCA 1.2.3 runtime (about 32 MB), verifies its SHA-256, and starts it on loopback port 2014. `npm run setup:scrambles` can prepare the runtime separately. `npm run preview` also starts the helper; a static deployment needs a companion TNoodle API. Open the local URL printed by Vite. Use desktop Chrome or Edge for Web Bluetooth. The app also works without hardware in keyboard simulator mode.

## Practice

1. Start with a solved cube and choose the matching up/front solving frame.
2. Browse F2L / OLL / PLL sections, select preferred alternates, and add individual algorithms or the visible section to a training session. Choose balanced cycles or adaptive weighting, then start training.
3. Follow the setup moves. If you make a mistake, undo the correction queue shown on screen.
4. Recognize the case and execute. The first turn starts execution timing; the attempt completes when the tracked cube is solved.
5. Review the recognition/execution split, TPS, and pause bars. Use the Analytics tab for saved history and the Library tab for search and learning status.

Keyboard shortcuts follow the selected preset (open Keybinds for the full reference). Default examples: J/F = U/U', I/K = R/R', H/G = F/F', C = U2, M = R2. Space reveals a hidden algorithm; Enter continues from review; Escape returns to selection. Shortcuts ignore text fields, controls, and repeated keydown events.

## Cube views and alignment

- **Dual View**: 3D cube alongside the Voxygen-style six-face projection and nine rails.
- **3D Cube**: full 3D viewer with manual alignment.
- **Voxygen 2D**: full rail projection; select a face and use its rotation buttons during simulator practice.
- **Facelet Net** and **Last Layer**: alternative sticker diagrams.

Every view follows received move history, including repeated turns. Select a case to start simulator practice. Blind recognition hides the case name and algorithm during recognition/execution; setup notation stays visible.

To set your **solving frame**, drag the 3D cube and release: it snaps to one of the 24 valid up/front orientations. You can also choose **Up face** and **Front face** explicitly. GAN sensor face turns are interpreted relative to this saved frame. Choose your grip before selecting a case or starting a scramble; the frame locks during the attempt. While locked, dragging changes only the viewing angle. Turn/Tilt/Roll and Reset view remain available for viewing.

Frame mapping assumes the standard GAN face labels/color scheme and a solved logical starting state. Arbitrary whole-cube regrips during hardware solves still require manual frame tracking or the planned camera tracking. Snap orientation is a manual calibration, not automatic gyroscope replacement.

## General solving timer

Open **Solve Timer** to practice a full 3×3 solve, independent of algorithm cases.

1. Choose your up/front grip, then paste a scramble or generate an official-program random-state scramble.
2. Select **Use scramble**. In simulator or GAN mode, follow the guided setup; simulator users can also apply it instantly.
3. The first solving turn starts the clock. Solved-state detection stops it and saves the reconstruction.
4. Select a history entry to replay its scramble and step through the solution. **Export JSON** saves the complete records for backup or future analysis.

Manual mode confirms a physical scramble and uses Space or the Start/Stop buttons. It saves time and scramble, explicitly records that completion was unverified, and does not fabricate a solution. Move reconstruction requires simulator or GAN input.

History retains the latest 1,000 solves in this browser. Best, mean, ao5, and ao12 are shown; mean excludes DNF, and rolling averages trim extremes. There are no +2 penalties or enforced inspection limits yet. Changing tabs, input mode, disconnecting, or syncing during a running solve saves it as DNF. Generated scrambles come from the signed TNoodle-WCA 1.2.3 official program. Pasted or edited scrambles are marked custom. Generation failures offer retry and never silently substitute a random-move sequence. For WCA-standard application choose white up / green front; other selected grips apply the sequence relative to that grip for practice. These are local practice scrambles, not delegated competition scramble sets.

See [solve record format and analysis plans](./docs/SOLVE_RECORDS.md). No AI service receives your data automatically.

See the [viewer previews](./docs/README.md) and [development roadmap](./ROADMAP.md).

## Current limitations

The catalog covers 41 basic F2L, 57 OLL, and 21 PLL cases with 272 reference variants. Preferred and personal alternates, session selections, and per-variant statistics persist locally. See [catalog sources and validation](./docs/ALGORITHM_CATALOG.md) and [official scramble setup](./docs/OFFICIAL_SCRAMBLES.md). An independent standard-case classification audit remains pending. Hardware slice/wide/rotation decoding and initial facelet synchronization remain pending. Use outer-face-only algorithms with the calibrated grip for hardware trials; frame mapping for physical regrips during a solve is not automatic. Bluetooth integration requires physical-device verification. Stored data stays in the current browser and is not synced between devices.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for milestone status and the next engineering tasks.

## Checks

```powershell
npm test
npm run lint
npm run build
```
