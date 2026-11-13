import { create } from "zustand";
import type { HandFrame, TrackedHand } from "@/core/types";

interface HandsState {
  /** Hands from the most recent tracking result (empty when none are visible). */
  hands: TrackedHand[];
  timestamp: number;
  setFrame: (frame: HandFrame) => void;
  clear: () => void;
}

/**
 * Per-frame hand data. This updates 30-60 times a second, so read it with
 * `useHandsStore.getState()` inside render loops instead of subscribing React
 * components to it.
 */
export const useHandsStore = create<HandsState>((set) => ({
  hands: [],
  timestamp: 0,
  setFrame: (frame) => set({ hands: frame.hands, timestamp: frame.timestamp }),
  clear: () => set({ hands: [], timestamp: 0 }),
}));
