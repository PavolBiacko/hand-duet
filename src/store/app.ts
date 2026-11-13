import { create } from "zustand";
import type { CameraErrorKind } from "@/core/camera";

export type AppStatus =
  | "idle"
  | "requesting-camera"
  | "loading-model"
  | "running"
  | "error";

export type AppErrorKind = CameraErrorKind | "tracking";

export interface AppError {
  kind: AppErrorKind;
  message: string;
}

interface AppState {
  status: AppStatus;
  error: AppError | null;
  /** Whether the model runs on the GPU or fell back to CPU. */
  delegate: "GPU" | "CPU" | null;
  /** Tracking results per second (smoothed). */
  fps: number;
  /** Model time per frame in ms (smoothed). */
  inferenceMs: number;
  /** Number of hands currently tracked. */
  handCount: number;
  setStatus: (status: AppStatus) => void;
  setError: (error: AppError) => void;
  setDelegate: (delegate: "GPU" | "CPU") => void;
  setStats: (stats: { fps: number; inferenceMs: number; handCount: number }) => void;
  reset: () => void;
}

const initial = {
  status: "idle" as AppStatus,
  error: null,
  delegate: null,
  fps: 0,
  inferenceMs: 0,
  handCount: 0,
};

export const useAppStore = create<AppState>((set) => ({
  ...initial,
  setStatus: (status) => set({ status, error: null }),
  setError: (error) => set({ status: "error", error }),
  setDelegate: (delegate) => set({ delegate }),
  setStats: (stats) => set(stats),
  reset: () => set(initial),
}));
