import { create } from "zustand";
import type { CameraErrorKind } from "@/core/camera";
import { DEFAULT_MODULE_ID } from "@/modules/registry";

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
  /** Show the gesture debug overlay on top of the video. */
  debug: boolean;
  /** Id of the module that is (or will be) playing. */
  activeModuleId: string;
  setActiveModule: (id: string) => void;
  setDebug: (debug: boolean) => void;
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
  debug: false,
  activeModuleId: DEFAULT_MODULE_ID,
};

export const useAppStore = create<AppState>((set) => ({
  ...initial,
  setStatus: (status) => set({ status, error: null }),
  setError: (error) => set({ status: "error", error }),
  setDelegate: (delegate) => set({ delegate }),
  setStats: (stats) => set(stats),
  setDebug: (debug) => set({ debug }),
  setActiveModule: (activeModuleId) => set({ activeModuleId }),
  reset: () =>
    set((s) => ({ ...initial, debug: s.debug, activeModuleId: s.activeModuleId })),
}));
