import type { Handedness } from "../core/types.ts";

export type FingerName = "thumb" | "index" | "middle" | "ring" | "pinky";

export const FINGER_NAMES: readonly FingerName[] = [
  "thumb",
  "index",
  "middle",
  "ring",
  "pinky",
];

/** Everything the gesture layer knows about one hand in one frame. */
export interface HandGesture {
  handedness: Handedness;
  /** Which fingers are extended (with hysteresis). */
  fingers: Record<FingerName, boolean>;
  /** Number of extended fingers, 0..5, held steady through brief transitions. */
  fingerCount: number;
  /** Thumb and index fingertips touching. */
  pinch: boolean;
  /** 0 = fingertips far apart, 1 = touching. */
  pinchStrength: number;
  /** All four fingers curled. */
  fist: boolean;
  /**
   * Roll of the hand in the screen plane, in radians. 0 = fingers pointing up,
   * positive = tilted towards the right of the screen, negative = left.
   */
  tilt: number;
  /** Palm centre in display space, 0..1 (x: left to right, y: top to bottom). */
  x: number;
  y: number;
  /** Palm velocity in screen heights per second (positive vy = moving down). */
  vx: number;
  vy: number;
}

export type GestureEvent =
  | {
      type: "strum";
      hand: Handedness;
      direction: "down" | "up";
      /** 0..1, how hard the strum was. */
      strength: number;
    }
  | { type: "pinchStart" | "pinchEnd"; hand: Handedness }
  | { type: "fistStart" | "fistEnd"; hand: Handedness }
  | { type: "fingerCount"; hand: Handedness; count: number };

export interface GestureFrame {
  /** The user's left hand, or null when it is not visible. */
  left: HandGesture | null;
  /** The user's right hand, or null when it is not visible. */
  right: HandGesture | null;
  /** One-shot events that happened on this frame. */
  events: GestureEvent[];
  /** Frame time in ms. */
  timestamp: number;
}

export const EMPTY_GESTURES: GestureFrame = {
  left: null,
  right: null,
  events: [],
  timestamp: 0,
};
