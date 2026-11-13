import { schmitt } from "../../gestures/hysteresis.ts";
import type { GestureFrame, HandGesture } from "../../gestures/types.ts";

export const OCTAVES = [3, 4, 5] as const;

export interface ChordsState {
  /** Selected scale degree, 1..7 */
  degree: number;
  /** Major/minor swapped by tilting the left hand. */
  flipped: boolean;
  /** Index into OCTAVES, chosen by where the right hand is (left to right). */
  octaveIndex: number;
  /** True while the right hand is shown: the chord sounds at full volume. */
  active: boolean;
}

/** Tilt (degrees from upright) that flips major/minor, and where it flips back. */
const TILT_ON_DEG = 35;
const TILT_OFF_DEG = 22;

/** Right-hand x positions where the octave zones meet, and the hysteresis margin. */
const ZONE_EDGES = [0.667, 0.833];
const ZONE_MARGIN = 0.02;

/** The chord keeps sounding this long after the right hand was last seen. */
export const HOLD_MS = 200;

/**
 * Chord shape of the left hand:
 *   1-4 fingers (thumb tucked) -> I, II, III, IV
 *   open hand                  -> V
 *   thumb only                 -> VI
 *   thumb + index ("L")        -> VII
 * A fist (or anything unclear) returns null, which keeps the current chord.
 */
export function degreeFromHand(hand: HandGesture): number | null {
  const { thumb, index, middle, ring, pinky } = hand.fingers;
  const long = Number(index) + Number(middle) + Number(ring) + Number(pinky);
  if (thumb && long === 0) return 6;
  if (thumb && long === 1 && index) return 7;
  const count = hand.fingerCount;
  return count >= 1 && count <= 5 ? count : null;
}

function octaveZone(previous: number, x: number): number {
  let zone = previous;
  // Move up/down one zone at a time, only when clearly past the edge.
  while (zone < ZONE_EDGES.length && x > ZONE_EDGES[zone] + ZONE_MARGIN) zone++;
  while (zone > 0 && x < ZONE_EDGES[zone - 1] - ZONE_MARGIN) zone--;
  return zone;
}

/**
 * The Chords module's logic, without any audio: gestures in, chord state out.
 *
 * Left hand: its finger shape picks the degree and tilting it swaps
 * major/minor. When it is not visible the last chord is kept.
 * Right hand: while it is visible the chord sounds (no strumming needed);
 * its sideways position picks the octave.
 */
export class ChordsController {
  state: ChordsState = { degree: 1, flipped: false, octaveIndex: 1, active: false };
  private lastRightAt = -Infinity;

  update(gestures: GestureFrame): ChordsState {
    const { left, right } = gestures;
    const s = this.state;

    if (left) {
      const degree = degreeFromHand(left);
      if (degree !== null) s.degree = degree;
      const tiltDeg = Math.abs((left.tilt * 180) / Math.PI);
      s.flipped = schmitt(s.flipped, tiltDeg, TILT_ON_DEG, TILT_OFF_DEG);
    }
    if (right) {
      this.lastRightAt = gestures.timestamp;
      s.octaveIndex = octaveZone(s.octaveIndex, right.x);
    }
    // A short hold, so one missed tracking frame does not chop the sound.
    s.active = gestures.timestamp - this.lastRightAt <= HOLD_MS;
    return s;
  }

  /** Select a degree directly (keyboard fallback). */
  setDegree(degree: number): void {
    if (degree >= 1 && degree <= 7) this.state.degree = degree;
  }
}

/** Which fingers are up for each degree (index 0 = degree I). */
export const DEGREE_SHAPES: readonly {
  fingers: readonly [thumb: boolean, index: boolean, middle: boolean, ring: boolean, pinky: boolean];
  label: string;
}[] = [
  { fingers: [false, true, false, false, false], label: "1 finger" },
  { fingers: [false, true, true, false, false], label: "2 fingers" },
  { fingers: [false, true, true, true, false], label: "3 fingers" },
  { fingers: [false, true, true, true, true], label: "4 fingers" },
  { fingers: [true, true, true, true, true], label: "open hand" },
  { fingers: [true, false, false, false, false], label: "thumb" },
  { fingers: [true, true, false, false, false], label: "thumb + index" },
];
