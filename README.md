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

## Layout

- `src/core/` – camera access, MediaPipe tracking worker, frame loop, FPS
- `src/render/` – Canvas 2D drawing (hand skeleton)
- `src/store/` – Zustand stores (app status, per-frame hands)
- `src/components/` – React UI
- `scripts/copy-mediapipe-wasm.mjs` – copies the MediaPipe WASM runtime into `public/` on install
