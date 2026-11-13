// Copies the MediaPipe WASM runtime out of node_modules into /public so it is
// served from our own origin (no CDN needed at runtime). Runs on postinstall.
import { cp, mkdir, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// The package only exports its entry file, so resolve that and go up.
const pkgDir = path.dirname(require.resolve("@mediapipe/tasks-vision"));
const src = path.join(pkgDir, "wasm");
const dest = path.join(root, "public", "mediapipe", "wasm");

await rm(dest, { recursive: true, force: true });
await mkdir(dest, { recursive: true });
await cp(src, dest, { recursive: true });
console.log(`[mediapipe] copied wasm runtime to ${path.relative(root, dest)}`);
