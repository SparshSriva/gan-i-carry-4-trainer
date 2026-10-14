# Public trainer comparison

Reviewed October 14, 2026 using public product descriptions. This is a behavior comparison for independent implementation; no proprietary app code, binaries, assets, or protocols were extracted.

| Reference | Public behavior useful here | Current response / next step |
| --- | --- | --- |
| [csTimer](https://cstimer.net/) | Manual, Bluetooth, and virtual-cube timing; solve details include scramble/date and reconstruction when available | General timer saves scramble and timestamped solution, supports manual timing, replay, local export, and rolling averages. Next: inspection rules, penalties, sessions, official random-state scrambles. |
| [Cubeast](https://www.cubeast.com/) | Bluetooth timer with solution analysis and shareable solve analysis | Keep complete reconstructions and input provenance. Next: local phase/pause analysis and annotations; sharing requires an explicit user action. |
| [GAN CubeStation public listing](https://apps.apple.com/us/app/cubestation-new/id6473158674) | Teaching, training, and time trials | Trainer learning buckets and general solve practice; continue hardware testing and catalog expansion. |
| [Voxygen 2D cube article](https://voxygen.dev/posts/2D_rubiks) | User-provided reference for a six-face projection with looping rails | Retain the independent rail renderer alongside 3D/net/last-layer views. It follows the same logical history and calibrated starting frame. |

The Voxygen page was not retrievable through the web search tool during the prior implementation pass; its visual reference came from the user-provided screenshot and the existing local geometry implementation. This comparison does not assert exact feature parity or reverse-engineer proprietary implementations.

## Priorities

1. Reliable calibrated hardware state, raw events, and solve records before advanced analysis.
2. Useful review: scramble + reconstruction + timing + replay + export.
3. Session management, penalties, import validation, and phase/pause analysis.
4. Confidence-aware camera pose tracking and explicit, consent-based AI analysis of saved solves.
