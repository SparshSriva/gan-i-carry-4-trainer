# Technical Architecture & Agent Transfer Guide: GAN i Carry 4 Trainer

## 1. Executive Summary & Mathematical Foundation

This application is a speedcubing algorithm trainer and group-theory visualization suite for the **GAN i Carry 4** smart cube and keyboard simulators. It bridges physical hardware telemetry with real-time topological representations.

### The 2D Permutation Graph (*NavaCakraYantra*)
The puzzle state is mathematically modeled as an element of the permutation group $\mathcal{G} \le S_{54}$:
* **9 Interlocking Circles:** The 3 spatial axes ($X, Y, Z$) each possess 3 parallel layers ($L, M, R$ for $X$; $U, E, D$ for $Y$; $F, S, B$ for $Z$). Each layer forms an independent circular track carrying 12 sticker nodes.
* **54 Facelet Nodes:** The 54 outward stickers of the cube sit at the exact geometric intersections of circles from orthogonal axes. Every sticker belongs to exactly two circles (the two axes perpendicular to its outward normal).
* **Gear-Action Permutations:** When a layer turns, its circle revolves, transporting its 12 nodes along the track by a discrete quarter-turn step ($\pm \pi / 2$).

---

## 2. Directory Structure & Key Modules

```
gan-i-carry-4-trainer/
├── src/
│   ├── components/
│   │   ├── CubeCanvas.tsx              # Multi-mode visualizer (Dual View, 3D, 9-Circles, 2D LL)
│   │   ├── NavaCakraYantra.tsx         # The 9-Circles 54-node Permutation Graph SVG engine
│   │   ├── PermGraph.tsx               # Top-down Last Layer cycle diagram with bezier arrows
│   │   ├── NavBar.tsx                  # Header with XP/Level progression, streak flame, audio toggle
│   │   ├── TrainerView.tsx             # Two-column layout with visualizer & scramble assistant
│   │   ├── ScrambleStrip.tsx           # Dynamic scramble token strip with half-turn & error recovery
│   │   ├── CaseCard.tsx                # Algorithm card with blind mode & stats
│   │   ├── CaseSelector.tsx            # Filterable grid of PLL & OLL cases
│   │   ├── TelemetryBar.tsx            # Granular recognition/execution splits & per-move delta bar chart
│   │   ├── StateBanner.tsx             # State machine phase banner
│   │   └── KeybindReferenceModal.tsx   # Interactive HyperSpeedCube keyboard layout tester
│   ├── data/
│   │   ├── algDatabase.ts              # Pre-loaded 21 PLL cases + 2-Look OLL cases
│   │   └── navaCakraGeometry.ts        # Mathematical circle coordinates, belts, and permutation arrays
│   ├── hooks/
│   │   ├── useTrainerState.ts          # Core state machine, keyboard simulator listener, BLE hub
│   │   └── useXpSystem.ts              # Gamified XP calculation, streak multiplier, tier progression
│   ├── utils/
│   │   ├── faceletSimulator.ts         # Pure mathematical facelet state transitions (54-char string)
│   │   ├── keybinds.ts                 # HyperSpeedCube ergonomic home-row layout & direct notation
│   │   ├── moveUtils.ts                # WCA notation parser, alg inversion, move merging (R + R = R2)
│   │   ├── ScrambleAssistant.ts        # Scramble progress tracker, double-turn window, correction queue
│   │   ├── soundEffects.ts             # Synthesized zero-latency Web Audio API click/beep/chimes
│   │   ├── storage.ts                  # localStorage persistence for attempts and EMA statistics
│   │   └── weightedSelection.ts        # Priority-weighted spaced-repetition algorithm
│   ├── App.tsx                         # Root container
│   ├── main.tsx                        # Entry point
│   └── types.ts                        # Unified TypeScript interfaces
```

---

## 3. Operational Protocols & Subsystems

### 3.1 Scramble Assistant State Machine
The scramble assistant implements dynamic error recovery:
1. **Scramble Sequence**: Inverts the selected algorithm to position the cube into the required pre-state.
2. **Double Turn Merging ($R2$)**: Physical sensors emit two single turns. A $250\text{ ms}$ window combines $R + R \to R2$ visually without flagging false errors.
3. **Correction Queue**: If a user performs move $M_{\text{wrong}}$ instead of $M_{\text{expected}}$, progression halts. The inverse $M_{\text{wrong}}^{-1}$ is placed in the correction queue. The system resumes once the correction queue is cleared.

### 3.2 HyperSpeedCube Keyboard Simulation
Ergonomic home-row speedcubing layout:
* **Right Hand**: `J` ($U$), `I` ($R$), `K` ($R'$), `M` ($R2$), `H` ($F$), `L` ($D'$), `P`/`O` ($B$/$B'$), `N` ($M$), `;` ($y$).
* **Left Hand**: `F` ($U'$), `C` ($U2$), `D` ($L$), `E` ($L'$), `V` ($L2$), `G` ($F'$), `S` ($D$), `Z` ($D2$), `W`/`Q` ($B$/$B'$), `B` ($M'$), `A` ($y'$).
* **Control Keys**: `Space` (Reveal Alg Hint), `Enter` (Next Case), `Esc` (Case Selector).

### 3.3 Gamification Engine (*Karma-Phala*)
* Solves award base XP ($10\text{ XP}$) with performance multipliers:
  * High TPS ($>5\text{ TPS} \implies +5\text{ XP}$; $>10\text{ TPS} \implies +10\text{ XP}$).
  * Quick Recognition ($<2\text{s} \implies +3\text{ XP}$; $<1\text{s} \implies +7\text{ XP}$).
  * Flawless Solve ($+5\text{ XP}$).
  * Multiplier Streak: $\text{multiplier} = \min(1 + 0.1 \times \text{streak}, 2.0)$.
* Tier progression spans 10 ranks from *Beginner* to *Legend*.

---

## 4. Hardware Integration Roadmap (Milestone 3 for Next Agents)

When implementing the direct BLE GATT layer for the **GAN i Carry 4**:
1. **BLE GATT Service**: GAN cubes communicate over proprietary GATT characteristics.
2. **AES-128 CBC Decryption**: GAN Gen 4 packet payloads are encrypted with AES-128 CBC using a key salted with the cube's MAC address.
3. **Browser Privacy Workaround**: Because Web Bluetooth hides the MAC address in Chromium, wire up the MAC address input modal in `NavBar` (persisting to `localStorage`).
4. **Hardware Events Mapping**:
   * Map incoming decrypted byte payloads directly into `feedMove(move)` in `useTrainerState.ts`.
   * Update battery percentage via the `BATTERY` event.
   * Send the initial facelet state via `FACELETS` event into `NavaCakraYantra`.
