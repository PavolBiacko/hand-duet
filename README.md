# Hand Duet

A browser instrument for two people far apart: play music and "touch" each other through webcam hand tracking. Hand tracking runs entirely in the browser; no video leaves the device.

## Develop

```bash
pnpm install
```

```bash
pnpm dev
```

Open http://localhost:3000 (the camera needs HTTPS or localhost).

Before committing:

```bash
pnpm lint
```

```bash
pnpm typecheck
```

```bash
pnpm test
```

Tests use Node's built-in test runner (Node 22.6+), so pure modules import each other with explicit `.ts` extensions.

## Layout

- `src/core/` – camera access, MediaPipe tracking worker, landmark smoothing, FPS
- `src/gestures/` – pure gesture layer: landmarks in, gestures and events out
- `src/pipeline/` – React hook that wires camera → tracking → smoothing → gestures
- `src/render/` – Canvas 2D drawing (hand skeleton, gesture debug overlay)
- `src/store/` – Zustand stores (app status, per-frame hands)
- `src/components/` – React UI
- `scripts/copy-mediapipe-wasm.mjs` – copies the MediaPipe WASM runtime into `public/` on install
