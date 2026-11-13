/**
 * Stateless measurements on a single hand. Everything here is a pure function
 * of the landmarks; thresholds and memory live in the engine.
 */
import { LM, type Landmark, type TrackedHand } from "../core/types.ts";
import type { FingerName } from "./types.ts";

const dist3 = (a: Landmark, b: Landmark) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** [MCP, PIP, DIP, TIP] landmark indices of the four long fingers. */
const FINGER_JOINTS: Record<Exclude<FingerName, "thumb">, readonly number[]> = {
  index: [LM.INDEX_MCP, LM.INDEX_PIP, LM.INDEX_DIP, LM.INDEX_TIP],
  middle: [LM.MIDDLE_MCP, LM.MIDDLE_PIP, LM.MIDDLE_DIP, LM.MIDDLE_TIP],
  ring: [LM.RING_MCP, LM.RING_PIP, LM.RING_DIP, LM.RING_TIP],
  pinky: [LM.PINKY_MCP, LM.PINKY_PIP, LM.PINKY_DIP, LM.PINKY_TIP],
};

/** Real-world hand size: wrist to middle knuckle, in metres (about 0.09). */
export function handScale(hand: TrackedHand): number {
  const w = hand.worldLandmarks;
  return dist3(w[LM.WRIST], w[LM.MIDDLE_MCP]) || 1e-6;
}

/**
 * How straight a finger is: straight-line knuckle-to-tip distance divided by
 * the length along the finger. ~0.95 when extended, ~0.3-0.6 when curled.
 * Uses 3D world landmarks, so it does not depend on how the hand is rotated.
 */
export function fingerStraightness(
  hand: TrackedHand,
  finger: Exclude<FingerName, "thumb">,
): number {
  const w = hand.worldLandmarks;
  const [mcp, pip, dip, tip] = FINGER_JOINTS[finger];
  const length =
    dist3(w[mcp], w[pip]) + dist3(w[pip], w[dip]) + dist3(w[dip], w[tip]);
  return length > 0 ? dist3(w[mcp], w[tip]) / length : 0;
}

/**
 * How far the thumb sticks out: distance from the thumb tip to the pinky
 * knuckle, in hand sizes. ~0.55-0.7 when folded in, ~0.9-1.4 when out.
 */
export function thumbOpenness(hand: TrackedHand): number {
  const w = hand.worldLandmarks;
  return dist3(w[LM.THUMB_TIP], w[LM.PINKY_MCP]) / handScale(hand);
}

/**
 * Distance between thumb tip and index tip, in hand sizes.
 * ~0.1-0.2 when touching, 0.4+ when apart.
 */
export function pinchDistance(hand: TrackedHand): number {
  const w = hand.worldLandmarks;
  return dist3(w[LM.THUMB_TIP], w[LM.INDEX_TIP]) / handScale(hand);
}

const PALM_POINTS = [
  LM.WRIST,
  LM.INDEX_MCP,
  LM.MIDDLE_MCP,
  LM.RING_MCP,
  LM.PINKY_MCP,
] as const;

/** Centre of the palm in display space (0..1). Steadier than any fingertip. */
export function palmCenter(hand: TrackedHand): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (const i of PALM_POINTS) {
    x += hand.landmarks[i].x;
    y += hand.landmarks[i].y;
  }
  return { x: x / PALM_POINTS.length, y: y / PALM_POINTS.length };
}

/**
 * Roll of the hand in the screen plane, in radians: the angle of the
 * wrist -> middle knuckle line. 0 = pointing up, positive = leaning right.
 *
 * @param aspect width / height of the video, so the angle is not distorted.
 */
export function wristTilt(hand: TrackedHand, aspect: number): number {
  const wrist = hand.landmarks[LM.WRIST];
  const knuckle = hand.landmarks[LM.MIDDLE_MCP];
  const dx = (knuckle.x - wrist.x) * aspect;
  const dy = knuckle.y - wrist.y;
  return Math.atan2(dx, -dy);
}
