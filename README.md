# GAN i Carry 4 Algorithm Trainer

Browser-based speedcubing algorithm trainer with real-time GAN i Carry 4 smart cube integration.

## Stack

- React + TypeScript (Vite 5)
- Tailwind CSS v4
- `cubing` — 3D WebGL cube rendering + alg manipulation
- `gan-web-bluetooth` — BLE GATT + AES-128 CBC decryption (Milestone 3)
- `lucide-react` — icons

## Run

```bash
cd gan-i-carry-4-trainer
npm run dev
```

## Keyboard Simulator (Simulator Mode ON)

| Key | Move | Key | Move |
|-----|------|-----|------|
| `u` | U    | `i` | U'   |
| `h` | R    | `j` | R'   |
| `f` | F    | `d` | F'   |
| `k` | L    | `l` | L'   |
| `r` | B    | `e` | B'   |
| `n` | D    | `m` | D'   |

## Milestones

- [x] **M1** — Core architecture, state machine, simulator, algorithm library (PLL + 2-Look OLL)
- [ ] **M2** — Scramble assistant: double-turn merging, slice/wide move parser
- [ ] **M3** — GAN i Carry 4 BLE integration, MAC address prompt, battery monitor
- [ ] **M4** — Telemetry persistence, JPerm bucket system, Analytics view
