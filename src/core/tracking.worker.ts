/// <reference lib="webworker" />
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import type { RawHand, WorkerRequest, WorkerResponse } from "./protocol";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

// MediaPipe loads its WASM glue with importScripts(), which only works in
// classic workers. Whether the bundler emits a classic or a module worker
// differs between dev and production builds, so detect it at runtime and pick
// the matching flavour of the runtime.
function isModuleWorker(): boolean {
  try {
    ctx.importScripts(); // no-op in classic workers, TypeError in module workers
    return false;
  } catch {
    return true;
  }
}

// In module workers MediaPipe falls back to `self.import`. Provide it so the
// bundler leaves the runtime URL alone instead of trying to resolve it.
(ctx as unknown as { import: (url: string) => Promise<unknown> }).import = (
  url: string,
) => import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url);

let landmarker: HandLandmarker | null = null;

function post(message: WorkerResponse) {
  ctx.postMessage(message);
}

async function init(wasmBasePath: string, modelUrl: string, maxHands: number) {
  const fileset = await FilesetResolver.forVisionTasks(
    wasmBasePath,
    isModuleWorker(),
  );
  const create = (delegate: "GPU" | "CPU") =>
    HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: modelUrl, delegate },
      runningMode: "VIDEO",
      numHands: maxHands,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

  try {
    landmarker = await create("GPU");
    post({ type: "ready", delegate: "GPU" });
  } catch {
    landmarker = await create("CPU");
    post({ type: "ready", delegate: "CPU" });
  }
}

let lastTimestamp = -1;

function detect(bitmap: ImageBitmap, timestamp: number) {
  if (!landmarker) {
    bitmap.close();
    return;
  }
  // MediaPipe requires strictly increasing timestamps.
  const ts = Math.max(Math.round(timestamp), lastTimestamp + 1);
  lastTimestamp = ts;

  const started = performance.now();
  try {
    const result = landmarker.detectForVideo(bitmap, ts);
    const hands: RawHand[] = result.landmarks.map((landmarks, i) => {
      const category = result.handedness[i]?.[0];
      return {
        label: category?.categoryName === "Left" ? "Left" : "Right",
        score: category?.score ?? 0,
        landmarks: landmarks.map(({ x, y, z }) => ({ x, y, z })),
        worldLandmarks: (result.worldLandmarks[i] ?? []).map(({ x, y, z }) => ({
          x,
          y,
          z,
        })),
      };
    });
    post({
      type: "result",
      hands,
      timestamp,
      inferenceMs: performance.now() - started,
    });
  } catch (err) {
    post({
      type: "error",
      message: err instanceof Error ? err.message : String(err),
      fatal: false,
    });
    // Still answer, so the main thread keeps sending frames.
    post({ type: "result", hands: [], timestamp, inferenceMs: 0 });
  } finally {
    bitmap.close();
  }
}

ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  if (msg.type === "init") {
    init(msg.wasmBasePath, msg.modelUrl, msg.maxHands).catch((err) => {
      post({
        type: "error",
        message: err instanceof Error ? err.message : String(err),
        fatal: true,
      });
    });
  } else if (msg.type === "frame") {
    detect(msg.bitmap, msg.timestamp);
  }
};
