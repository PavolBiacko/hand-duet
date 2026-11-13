import { create } from "zustand";
import type { TrackedHand } from "@/core/types";
import { EMPTY_GESTURES, type GestureFrame } from "@/gestures";

export interface ProcessedFrame {
  /** Smoothed hands in display space (empty when none are visible). */
  hands: TrackedHand[];
  /** Gestures and one-shot events derived from `hands`. */
  gestures: GestureFrame;
  timestamp: number;
}

interface HandsState extends ProcessedFrame {
  setFrame: (frame: ProcessedFrame) => void;
  clear: () => void;
}

const EMPTY: ProcessedFrame = { hands: [], gestures: EMPTY_GESTURES, timestamp: 0 };

/**
 * Per-frame hand data. This updates 30-60 times a second, so read it with
 * `useHandsStore.getState()` (or `.subscribe`) inside render loops instead of
 * subscribing React components to it.
 */
export const useHandsStore = create<HandsState>((set) => ({
  ...EMPTY,
  setFrame: (frame) => set(frame),
  clear: () => set(EMPTY),
}));
