# GAN i4 Algorithm Trainer

Browser-based algorithm practice with guided scramble recovery, a keyboard simulator, GAN Web Bluetooth integration, a searchable algorithm library, and local practice analytics.

## Run

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite. Use desktop Chrome or Edge for Web Bluetooth. The app also works without hardware in keyboard simulator mode.

## Practice

1. Start with a solved cube, white on top and green in front.
2. Select a case, or choose a subset/learning-status filter and use Random Next for a weighted practice queue.
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

To match your solving angle, drag the 3D cube with a mouse or touch. Use **Turn / Tilt / Roll** below the viewer for precise adjustment. Focus the 3D viewer and use arrow keys to turn or tilt it. **Reset view** restores the default perspective. Alignment survives case changes, view switching, and reloads in the same browser.

Alignment changes the viewing angle only. It does not record turns, alter timing, or remap the cube's logical face labels. Hardware practice still requires the fixed logical orientation described below. Camera-based orientation tracking is planned; it is not enabled.

See the [viewer previews](./docs/README.md) and [development roadmap](./ROADMAP.md).

## Current limitations

The catalog includes 21 PLL entries and an OLL starter set; full OLL/F2L and a standard-case audit remain pending. Hardware slice/wide/rotation decoding and initial facelet synchronization remain pending. Use outer-face-only algorithms with a fixed orientation for hardware trials. Bluetooth integration requires physical-device verification. Stored data stays in the current browser and is not synced between devices.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for milestone status and the next engineering tasks.

## Checks

```powershell
npm test
npm run lint
npm run build
```
