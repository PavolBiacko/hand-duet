import {
  HAND_MODEL_URL,
  MAX_HANDS,
  TRACKING_FRAME_WIDTH,
  WASM_BASE_PATH,
} from "./config";
import { toDisplayHand } from "./normalize";
import type { WorkerRequest, WorkerResponse } from "./protocol";
import type { HandFrame } from "./types";

export interface TrackerCallbacks {
  onReady?: (delegate: "GPU" | "CPU") => void;
  onFrame: (frame: HandFrame) => void;
  onError?: (message: string, fatal: boolean) => void;
}

type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: () => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

/** If the worker has not answered for this long, assume the frame was lost. */
const BUSY_TIMEOUT_MS = 2000;

/**
 * Main-thread side of hand tracking. Grabs frames from a <video>, sends them
 * to the MediaPipe worker and reports results in display space.
 *
 * Only one frame is in flight at a time: if the model is slower than the
 * camera, extra frames are dropped instead of queueing up (which would add
 * latency).
 */
export class HandTracker {
  private worker: Worker | null = null;
  private ready = false;
  private busySince = 0;
  private running = false;
  private frameHandle = 0;
  private usesVideoCallback = false;
  private resizeSupported = true;

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly callbacks: TrackerCallbacks,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;

    const worker = new Worker(new URL("./tracking.worker.ts", import.meta.url), {
      type: "module",
    });
    this.worker = worker;
    worker.onmessage = (event: MessageEvent<WorkerResponse>) =>
      this.handleMessage(event.data);
    worker.onerror = (event) => {
      this.callbacks.onError?.(event.message || "Tracking worker crashed", true);
    };

    const init: WorkerRequest = {
      type: "init",
      // The worker needs absolute URLs: its own base URL is the bundled chunk.
      wasmBasePath: new URL(WASM_BASE_PATH, window.location.origin).href,
      modelUrl: HAND_MODEL_URL,
      maxHands: MAX_HANDS,
    };
    worker.postMessage(init);
    this.scheduleNext();
  }

  stop(): void {
    this.running = false;
    this.ready = false;
    this.busySince = 0;
    const video = this.video as VideoWithFrameCallback;
    if (this.usesVideoCallback) {
      video.cancelVideoFrameCallback?.(this.frameHandle);
    } else {
      cancelAnimationFrame(this.frameHandle);
    }
    this.worker?.terminate();
    this.worker = null;
  }

  private handleMessage(msg: WorkerResponse): void {
    if (!this.running) return;
    switch (msg.type) {
      case "ready":
        this.ready = true;
        this.callbacks.onReady?.(msg.delegate);
        break;
      case "result":
        this.busySince = 0;
        this.callbacks.onFrame({
          hands: msg.hands.map(toDisplayHand),
          timestamp: msg.timestamp,
          inferenceMs: msg.inferenceMs,
        });
        break;
      case "error":
        this.callbacks.onError?.(msg.message, msg.fatal);
        break;
    }
  }

  private scheduleNext(): void {
    if (!this.running) return;
    const video = this.video as VideoWithFrameCallback;
    const tick = () => {
      void this.captureFrame();
      this.scheduleNext();
    };
    if (typeof video.requestVideoFrameCallback === "function") {
      // Fires once per new camera frame, so we never process a frame twice.
      this.usesVideoCallback = true;
      this.frameHandle = video.requestVideoFrameCallback(tick);
    } else {
      this.usesVideoCallback = false;
      this.frameHandle = requestAnimationFrame(tick);
    }
  }

  private async captureFrame(): Promise<void> {
    const { video, worker } = this;
    if (!worker || !this.ready) return;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const now = performance.now();
    if (this.busySince > 0 && now - this.busySince < BUSY_TIMEOUT_MS) return;
    this.busySince = now;

    try {
      const bitmap = await this.grabBitmap();
      if (!this.running || this.worker !== worker) {
        bitmap.close();
        return;
      }
      const message: WorkerRequest = { type: "frame", bitmap, timestamp: now };
      worker.postMessage(message, [bitmap]);
    } catch {
      // Frame could not be captured (e.g. camera is switching). Try the next one.
      this.busySince = 0;
    }
  }

  private async grabBitmap(): Promise<ImageBitmap> {
    const { video } = this;
    if (this.resizeSupported && video.videoWidth > TRACKING_FRAME_WIDTH) {
      try {
        return await createImageBitmap(video, {
          resizeWidth: TRACKING_FRAME_WIDTH,
          resizeHeight: Math.round(
            (TRACKING_FRAME_WIDTH * video.videoHeight) / video.videoWidth,
          ),
          resizeQuality: "low",
        });
      } catch {
        // Some browsers reject resize options for video sources.
        this.resizeSupported = false;
      }
    }
    return createImageBitmap(video);
  }
}
