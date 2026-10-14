# GAN i Carry 4 Smart Cube Algorithm Trainer

A browser-based Speedcubing Algorithm Trainer, Scramble Assistant, and Group-Theory Permutation Visualizer built for the **GAN i Carry 4** smart cube and high-speed keyboard simulation.

[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/SparshSriva/gan-i-carry-4-trainer)

---

## Key Features

1. **Dual Representation Visualizer**:
   - **3D WebGL Cube**: Real-time 3D rendered puzzle powered by `cubing/twisty`.
   - **2D Permutation Graph (*NavaCakraYantra*)**: Mathematical 9-overlapping-circles topological graph mapping all 54 individual sticker facelets. Rotating layers turns the circular tracks and shifts nodes along the belt.
   - **Side-by-Side Dual View**: Inspect both 3D perspective and 2D group-theoretic permutations simultaneously.
   - **2D Last-Layer Cycle Diagram (*PermGraph*)**: Visualizes PLL permutation cycle arrows and OLL orientations.

2. **HyperSpeedCube Ergonomic Keybinds**:
   - Two-handed home-row speedcubing layout:
     - **Right Hand**: `J` ($U$), `I` ($R$), `K` ($R'$), `M` ($R2$), `H` ($F$), `L` ($D'$), `P`/`O` ($B$/$B'$), `N` ($M$), `;` ($y$).
     - **Left Hand**: `F` ($U'$), `C` ($U2$), `D` ($L$), `E` ($L'$), `V` ($L2$), `G` ($F'$), `S` ($D$), `Z` ($D2$), `W`/`Q` ($B$/$B'$), `B` ($M'$), `A` ($y'$).
   - In-app interactive key tester modal with real-time keypress highlighting.

3. **Cleanroom Scramble Assistant & Dynamic Error Recovery**:
   - Step-by-step horizontal scramble progression with double-turn ($R2$) merging.
   - Automatic mistake detection with an active inverse correction queue.

4. **Gamification & Tactile Telemetry**:
   - XP, levels, and streak multipliers based on turns per second (TPS), recognition time, and error-free solves.
   - Synthesized Web Audio API sound effects (magnetic mechanical clicks, error alerts, solve victory chimes).
   - Micro-bar execution chart highlighting pauses ($>300\text{ ms}$) in red.

---

## Quick Start

```powershell
# Clone and enter directory
git clone https://github.com/SparshSriva/gan-i-carry-4-trainer.git
cd gan-i-carry-4-trainer

# Install dependencies
npm install

# Launch development server
npm run dev
```

Open `http://localhost:5173` in any Chromium-based browser (Chrome, Edge, Brave).

---

## Architecture Documentation

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for detailed group-theory formulation, data contracts, and the Milestone 3 Bluetooth GATT implementation roadmap.
