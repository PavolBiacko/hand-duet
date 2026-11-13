import type { RawHand } from "./protocol";
import type { TrackedHand } from "./types";

/**
 * Converts a raw MediaPipe hand into display space.
 *
 * - x is mirrored so coordinates match the selfie view on screen.
 * - Handedness is kept as reported. The model is fed the raw (unmirrored)
 *   camera frame, and for such frames its label is the person's real hand
 *   (checked against a reference photo). If labels ever come out swapped on a
 *   device, this is the one place to flip them.
 */
export function toDisplayHand(raw: RawHand): TrackedHand {
  return {
    handedness: raw.label,
    score: raw.score,
    landmarks: raw.landmarks.map((p) => ({ x: 1 - p.x, y: p.y, z: p.z })),
    worldLandmarks: raw.worldLandmarks.map((p) => ({ x: -p.x, y: p.y, z: p.z })),
  };
}
