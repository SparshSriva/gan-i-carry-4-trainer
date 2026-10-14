# Official-program scramble generation

The WCA currently approves TNoodle-WCA 1.2.3 (checked October 14, 2026): https://www.worldcubeassociation.org/regulations/scrambles/. Regulation 4b: https://www.worldcubeassociation.org/regulations/#4b.

The app runs the signed official release locally. Java 17+ is required. `npm run dev` and `npm run preview` verify/download the approximately 32 MB JAR into ignored `.runtime/tnoodle`, then start it on 127.0.0.1:2014. `npm run setup:scrambles` prepares the runtime separately. The launcher reuses a verified existing service and shuts down services it owns when exiting. The JAR is not committed or modified.

Release: https://github.com/thewca/tnoodle/releases/tag/v1.2.3
Pinned SHA-256: `e9ff6a164effee8a7ecdcc5c18111d4aa09d1de471b71de224889a1282d98cd5`.

Vite proxies `/api/tnoodle` to the loopback service. The browser verifies `/version` identifies signed TNoodle-WCA 1.2.3, then POSTs `{}` to `/frontend/puzzle/333/scramble`. Only the returned outer-face sequence is accepted. Errors are visible with retry; there is no random-move fallback. Static hosting requires a companion API exposing the same restricted endpoints; do not publish the full TNoodle administration service.

Solve records preserve generator version, event, signed-build status, and generation timestamp. Editing/pasting marks the sequence custom. These are official-program-generated local practice scrambles; this app does not distribute authorized competition scramble sets or manage delegate secrecy. Choose white up and green front for standard WCA scramble application. Other selected frames deliberately apply the sequence relative to that practice grip, recorded for reconstruction.
