import type { Handedness, Landmark } from "./types";

/** Messages: main thread -> tracking worker */
export type WorkerRequest =
  | { type: "init"; wasmBasePath: string; modelUrl: string; maxHands: number }
  | { type: "frame"; bitmap: ImageBitmap; timestamp: number };

/** Raw hand as reported by MediaPipe (image space, not mirrored). */
export interface RawHand {
  /** Handedness label as reported by MediaPipe for the frame it was given. */
  label: Handedness;
  score: number;
  landmarks: Landmark[];
  worldLandmarks: Landmark[];
}

/** Messages: tracking worker -> main thread */
export type WorkerResponse =
  | { type: "ready"; delegate: "GPU" | "CPU" }
  | { type: "result"; hands: RawHand[]; timestamp: number; inferenceMs: number }
  | { type: "error"; message: string; fatal: boolean };
