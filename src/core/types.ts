/** A single hand landmark in normalized image space (0..1), z relative to wrist. */
export interface Landmark {
  x: number;
  y: number;
  z: number;
}

/** Which of the user's real hands this is (not which side of the screen). */
export type Handedness = "Left" | "Right";

export interface TrackedHand {
  handedness: Handedness;
  /** Handedness confidence 0..1 */
  score: number;
  /**
   * 21 landmarks in *display space*: x is already mirrored so it matches the
   * selfie view the user sees (x=0 is the left edge of the screen).
   */
  landmarks: Landmark[];
  /** 21 landmarks in metres, origin at the hand's geometric centre. */
  worldLandmarks: Landmark[];
}

export interface HandFrame {
  hands: TrackedHand[];
  /** performance.now() timestamp of the video frame this result belongs to. */
  timestamp: number;
  /** How long the model took for this frame, in ms. */
  inferenceMs: number;
}

/** MediaPipe hand landmark indices. */
export const LM = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
} as const;

/** Pairs of landmark indices that form the hand skeleton. */
export const HAND_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4], // thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // index
  [5, 9], [9, 10], [10, 11], [11, 12], // middle
  [9, 13], [13, 14], [14, 15], [15, 16], // ring
  [13, 17], [17, 18], [18, 19], [19, 20], // pinky
  [0, 17], // palm base
];
