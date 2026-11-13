import type { Handedness, TrackedHand } from "../core/types.ts";
import {
  fingerStraightness,
  palmCenter,
  pinchDistance,
  thumbOpenness,
  wristTilt,
} from "./features.ts";
import { Debounced, schmitt } from "./hysteresis.ts";
import type {
  FingerName,
  GestureEvent,
  GestureFrame,
  HandGesture,
} from "./types.ts";

/**
 * Thresholds, each as an on/off pair (hysteresis). Calibrated against
 * MediaPipe's reference photos; see features.ts for what each value measures.
 */
export interface GestureOptions {
  fingerExtended: { on: number; off: number };
  thumbExtended: { on: number; off: number };
  /** Pinch turns on *below* `on` and off *above* `off` (it is a distance). */
  pinch: { on: number; off: number };
  /** Fist turns on *below* `on` (mean finger straightness). */
  fist: { on: number; off: number };
  /** A new finger count must be held this long before it is reported. */
  fingerCountHoldMs: number;
  /** Palm speed (screen heights / second) that triggers a strum. */
  strumSpeed: number;
  /** Speed the hand must drop below before it can strum again. */
  strumRearmSpeed: number;
  /** Speed that counts as a full-strength strum. */
  strumMaxSpeed: number;
  /** Minimum time between two strums of the same hand. */
  strumCooldownMs: number;
  /** Time constant of the velocity low-pass filter. */
  velocitySmoothingMs: number;
  /** State of a hand is kept this long while it is not visible. */
  forgetAfterMs: number;
}

export const DEFAULT_GESTURE_OPTIONS: GestureOptions = {
  fingerExtended: { on: 0.82, off: 0.72 },
  thumbExtended: { on: 0.85, off: 0.75 },
  pinch: { on: 0.22, off: 0.32 },
  fist: { on: 0.6, off: 0.7 },
  fingerCountHoldMs: 90,
  strumSpeed: 1.5,
  strumRearmSpeed: 0.5,
  strumMaxSpeed: 4,
  strumCooldownMs: 100,
  velocitySmoothingMs: 40,
  forgetAfterMs: 300,
};

const LONG_FINGERS = ["index", "middle", "ring", "pinky"] as const;

interface HandState {
  fingers: Record<FingerName, boolean>;
  count: Debounced<number>;
  lastCount: number | null;
  pinch: boolean;
  fist: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  lastTime: number;
  strumArmed: boolean;
  lastStrum: number;
}

/**
 * Turns hand landmarks into gestures and one-shot events.
 *
 * It keeps a little memory per hand (for hysteresis, velocity and debouncing)
 * but has no other side effects: the same sequence of inputs always gives the
 * same outputs, which keeps it unit-testable and lets the remote side run the
 * exact same code on landmarks received over the network.
 */
export class GestureEngine {
  private readonly options: GestureOptions;
  private readonly state: Record<Handedness, HandState | null> = {
    Left: null,
    Right: null,
  };

  constructor(options: Partial<GestureOptions> = {}) {
    this.options = { ...DEFAULT_GESTURE_OPTIONS, ...options };
  }

  reset(): void {
    this.state.Left = null;
    this.state.Right = null;
  }

  /**
   * @param hands hands in display space (ideally already smoothed)
   * @param timestamp frame time in ms
   * @param aspect video width / height
   */
  update(
    hands: readonly TrackedHand[],
    timestamp: number,
    aspect: number,
  ): GestureFrame {
    const events: GestureEvent[] = [];
    const pick = (side: Handedness) => {
      let best: TrackedHand | null = null;
      for (const hand of hands) {
        if (hand.handedness !== side || hand.landmarks.length < 21) continue;
        if (hand.worldLandmarks.length < 21) continue;
        if (!best || hand.score > best.score) best = hand;
      }
      return best;
    };

    return {
      left: this.updateHand("Left", pick("Left"), timestamp, aspect, events),
      right: this.updateHand("Right", pick("Right"), timestamp, aspect, events),
      events,
      timestamp,
    };
  }

  private updateHand(
    side: Handedness,
    hand: TrackedHand | null,
    now: number,
    aspect: number,
    events: GestureEvent[],
  ): HandGesture | null {
    const o = this.options;
    let s = this.state[side];

    if (!hand) {
      if (s && now - s.lastTime > o.forgetAfterMs) {
        if (s.pinch) events.push({ type: "pinchEnd", hand: side });
        if (s.fist) events.push({ type: "fistEnd", hand: side });
        this.state[side] = null;
      }
      return null;
    }

    const center = palmCenter(hand);
    if (!s) {
      s = {
        fingers: { thumb: false, index: false, middle: false, ring: false, pinky: false },
        count: new Debounced<number>(o.fingerCountHoldMs),
        lastCount: null,
        pinch: false,
        fist: false,
        x: center.x,
        y: center.y,
        vx: 0,
        vy: 0,
        lastTime: now,
        strumArmed: true,
        lastStrum: -Infinity,
      };
      this.state[side] = s;
    }

    // Fingers
    let straightSum = 0;
    for (const finger of LONG_FINGERS) {
      const straightness = fingerStraightness(hand, finger);
      straightSum += straightness;
      s.fingers[finger] = schmitt(
        s.fingers[finger],
        straightness,
        o.fingerExtended.on,
        o.fingerExtended.off,
      );
    }
    s.fingers.thumb = schmitt(
      s.fingers.thumb,
      thumbOpenness(hand),
      o.thumbExtended.on,
      o.thumbExtended.off,
    );
    const rawCount =
      Number(s.fingers.thumb) +
      Number(s.fingers.index) +
      Number(s.fingers.middle) +
      Number(s.fingers.ring) +
      Number(s.fingers.pinky);
    const fingerCount = s.count.update(rawCount, now);
    if (fingerCount !== s.lastCount) {
      s.lastCount = fingerCount;
      events.push({ type: "fingerCount", hand: side, count: fingerCount });
    }

    // Fist: all four long fingers clearly curled. (Inverted: on below, off above.)
    const wasFist = s.fist;
    s.fist = !schmitt(!s.fist, straightSum / LONG_FINGERS.length, o.fist.off, o.fist.on);
    if (s.fist !== wasFist) {
      events.push({ type: s.fist ? "fistStart" : "fistEnd", hand: side });
    }

    // Pinch: thumb and index tips together. A fist also brings them close, so
    // it never counts as a pinch.
    const wasPinch = s.pinch;
    const pinchDist = pinchDistance(hand);
    s.pinch =
      !s.fist && !schmitt(!s.pinch, pinchDist, o.pinch.off, o.pinch.on);
    if (s.pinch !== wasPinch) {
      events.push({ type: s.pinch ? "pinchStart" : "pinchEnd", hand: side });
    }
    const pinchStrength = clamp01(
      (o.pinch.off * 2 - pinchDist) / (o.pinch.off * 2 - o.pinch.on * 0.5),
    );

    // Velocity, in screen heights per second, low-pass filtered.
    const dt = now - s.lastTime;
    if (dt > 0) {
      if (dt > o.forgetAfterMs) {
        // The hand was gone for a moment: don't turn the jump into a velocity.
        s.vx = 0;
        s.vy = 0;
        s.strumArmed = true;
      } else {
        const seconds = dt / 1000;
        const rawVx = ((center.x - s.x) * aspect) / seconds;
        const rawVy = (center.y - s.y) / seconds;
        const a = 1 - Math.exp(-dt / o.velocitySmoothingMs);
        s.vx += a * (rawVx - s.vx);
        s.vy += a * (rawVy - s.vy);
      }
      s.x = center.x;
      s.y = center.y;
      s.lastTime = now;
    }

    // Strum: a fast vertical flick. Fires once, then has to slow down again.
    const speed = Math.abs(s.vy);
    if (
      s.strumArmed &&
      speed >= o.strumSpeed &&
      now - s.lastStrum >= o.strumCooldownMs
    ) {
      s.strumArmed = false;
      s.lastStrum = now;
      events.push({
        type: "strum",
        hand: side,
        direction: s.vy > 0 ? "down" : "up",
        strength: clamp01(
          (speed - o.strumSpeed) / (o.strumMaxSpeed - o.strumSpeed),
        ),
      });
    } else if (!s.strumArmed && speed <= o.strumRearmSpeed) {
      s.strumArmed = true;
    }

    return {
      handedness: side,
      fingers: { ...s.fingers },
      fingerCount,
      pinch: s.pinch,
      pinchStrength,
      fist: s.fist,
      tilt: wristTilt(hand, aspect),
      x: center.x,
      y: center.y,
      vx: s.vx,
      vy: s.vy,
    };
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
