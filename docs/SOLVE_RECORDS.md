# Solve records and future analysis

General solves are separate from algorithm attempt statistics. Records live in localStorage under `ganicv4_solves_v1`, with the latest 1,000 retained. Export JSON for backups or future analysis. Exported JSON contains a `schemaVersion`, `exportedAt` ISO timestamp, and `solves` array.

## Record schema (version 1)

| Field | Meaning |
| --- | --- |
| `id`, `schemaVersion`, `puzzle` | UUID, schema version, and `3x3x3` |
| `createdAt` | Epoch milliseconds when the scramble session was created |
| `source` | `gan`, `simulator`, or `manual` |
| `scramble` | Validated outer-face target scramble in the selected solving frame |
| `startingGrip` | Physical GAN/color faces chosen as `up` and `front` |
| `setupMethod` | `guided`, `virtual-applied`, or `manual-confirmed` |
| `setupMoves` | Actual guided setup events, including correction moves |
| `solution` | Recorded solution events in order; empty for untracked manual timing |
| `durationMs` | First solution turn (or manual start) to completion/stop |
| `inspectionMs` | Ready-to-start interval; no enforced inspection rule |
| `solved` | Whether the tracked final state was verified solved |
| `termination` | `solved`, `manual`, or `dnf` |

Each move event stores `move` in grip-relative notation, epoch `timestamp`, and `elapsedMs`. Solution elapsed time is relative to the first timed turn. Pre-start whole-cube rotations have zero elapsed time but retain their epoch timestamp and order. GAN events additionally store `rawMove`, the original sensor face label. A selected frame is constant throughout each attempt.

A virtual-applied setup has no fabricated setup events: the target scramble defines its state. Manual-confirmed setups are not sensor-verified. Manual timing saves time and scramble but cannot supply an observed solution. Tracking from a physical GAN cube still needs acceptance testing, snapshot reconciliation, and packet-quality checks.

## Replay and future AI

Replay starts from a solved cube in the saved grip, applies the target scramble, and then applies a selected solution prefix. Input provenance and the raw/logical distinction are retained for future state reconstruction, pause analysis, CFOP phase detection, and algorithm suggestions. Wrong turns and corrections during execution stay in the solution rather than being simplified away.

Records do not contain camera images or video, and no AI service is connected. Future integrations should validate records, account for missing/out-of-order events, distinguish verified tracked solves from manual times, and ask before sending records outside the browser. Cube-pose tracking must remain separate from sticker permutation and solution timing.

Rolling ao5/ao12 trim the fastest and slowest result (5% rounded up); a DNF remaining after trimming makes the average DNF. Best and mean use non-DNF records. +2 penalties and session-specific statistics are not implemented yet.
