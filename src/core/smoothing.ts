import type { Handedness, Landmark, TrackedHand } from "./types.ts";

/**
 * One Euro filter (Casiez et al.): a low-pass filter whose cutoff rises with
 * speed. Slow movements are smoothed heavily (no jitter while holding still),
 * fast movements pass almost unfiltered (no lag while strumming).
 */
export class OneEuroFilter {
  private readonly minCutoff: number;
  private readonly beta: number;
  private readonly dCutoff: number;
  private x: number | null = null;
  private dx = 0;
  private t = 0;

  /**
   * @param minCutoff Cutoff (Hz) at rest. Lower = smoother but laggier.
   * @param beta How quickly the cutoff opens up with speed (per unit/second).
   */
  constructor(minCutoff: number, beta: number, dCutoff = 1) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  /** @param t time in seconds */
  filter(value: number, t: number): number {
    if (this.x === null) {
      this.x = value;
      this.t = t;
      return value;
    }
    const dt = t - this.t;
    if (dt <= 0) return this.x;
    this.t = t;

    const rawDx = (value - this.x) / dt;
    this.dx += alpha(this.dCutoff, dt) * (rawDx - this.dx);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x += alpha(cutoff, dt) * (value - this.x);
    return this.x;
  }
}

function alpha(cutoff: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

export interface SmoothingOptions {
  /** Filter settings for normalized screen coordinates (0..1). */
  minCutoff: number;
  beta: number;
  /** Filter settings for world coordinates (metres). */
  worldMinCutoff: number;
  worldBeta: number;
  /** A hand that disappears for longer than this is forgotten. */
  maxGapMs: number;
  /** Max wrist jump (normalized) for a detection to count as the same hand. */
  maxMatchDistance: number;
}

export const DEFAULT_SMOOTHING: SmoothingOptions = {
  minCutoff: 1.5,
  beta: 8,
  worldMinCutoff: 1.5,
  worldBeta: 40,
  maxGapMs: 300,
  maxMatchDistance: 0.3,
};

const POINTS = 21;
/** How far the handedness vote must swing before the label flips. */
const HANDEDNESS_FLIP = 0.3;

interface Track {
  filters: OneEuroFilter[];
  worldFilters: OneEuroFilter[];
  lastSeen: number;
  wrist: Landmark;
  /** Running vote: positive = Right, negative = Left. */
  bias: number;
  handedness: Handedness;
}

/**
 * Smooths hand landmarks over time and keeps each hand's identity stable.
 *
 * Detections are matched to the hand they were in the previous frame by wrist
 * position, so a hand keeps its filter state even if MediaPipe briefly reports
 * the wrong handedness. The handedness label itself is a running vote with
 * hysteresis, so one mislabeled frame cannot swap the hands' roles.
 */
export class HandSmoother {
  private readonly options: SmoothingOptions;
  private tracks: Track[] = [];

  constructor(options: Partial<SmoothingOptions> = {}) {
    this.options = { ...DEFAULT_SMOOTHING, ...options };
  }

  reset(): void {
    this.tracks = [];
  }

  /** @param timestamp frame time in milliseconds */
  apply(hands: readonly TrackedHand[], timestamp: number): TrackedHand[] {
    const { maxGapMs, maxMatchDistance } = this.options;
    this.tracks = this.tracks.filter((t) => timestamp - t.lastSeen <= maxGapMs);

    // Greedy nearest-wrist matching (at most 2x2, so brute force is fine).
    const pairs: { hand: number; track: number; d: number }[] = [];
    hands.forEach((hand, h) => {
      const wrist = hand.landmarks[0];
      if (!wrist) return;
      this.tracks.forEach((track, t) => {
        const d = Math.hypot(wrist.x - track.wrist.x, wrist.y - track.wrist.y);
        if (d <= maxMatchDistance) pairs.push({ hand: h, track: t, d });
      });
    });
    pairs.sort((a, b) => a.d - b.d);

    const assigned = new Map<number, Track>();
    const usedTracks = new Set<number>();
    for (const { hand, track } of pairs) {
      if (assigned.has(hand) || usedTracks.has(track)) continue;
      assigned.set(hand, this.tracks[track]);
      usedTracks.add(track);
    }

    const seconds = timestamp / 1000;
    return hands.map((hand, h) => {
      if (hand.landmarks.length < POINTS) return hand;
      let track = assigned.get(h);
      if (!track) {
        track = this.createTrack(hand);
        this.tracks.push(track);
      }
      track.lastSeen = timestamp;

      const vote = (hand.handedness === "Right" ? 1 : -1) * hand.score;
      track.bias = track.bias * 0.8 + vote * 0.2;
      if (track.bias > HANDEDNESS_FLIP) track.handedness = "Right";
      else if (track.bias < -HANDEDNESS_FLIP) track.handedness = "Left";

      const landmarks = smoothPoints(hand.landmarks, track.filters, seconds);
      const worldLandmarks =
        hand.worldLandmarks.length >= POINTS
          ? smoothPoints(hand.worldLandmarks, track.worldFilters, seconds)
          : hand.worldLandmarks;
      track.wrist = landmarks[0];

      return {
        handedness: track.handedness,
        score: hand.score,
        landmarks,
        worldLandmarks,
      };
    });
  }

  private createTrack(hand: TrackedHand): Track {
    const o = this.options;
    const make = (minCutoff: number, beta: number) =>
      Array.from({ length: POINTS * 3 }, () => new OneEuroFilter(minCutoff, beta));
    return {
      filters: make(o.minCutoff, o.beta),
      worldFilters: make(o.worldMinCutoff, o.worldBeta),
      lastSeen: 0,
      wrist: hand.landmarks[0],
      bias: (hand.handedness === "Right" ? 1 : -1) * hand.score,
      handedness: hand.handedness,
    };
  }
}

function smoothPoints(
  points: readonly Landmark[],
  filters: OneEuroFilter[],
  t: number,
): Landmark[] {
  const out: Landmark[] = new Array(POINTS);
  for (let i = 0; i < POINTS; i++) {
    const p = points[i];
    out[i] = {
      x: filters[i * 3].filter(p.x, t),
      y: filters[i * 3 + 1].filter(p.y, t),
      z: filters[i * 3 + 2].filter(p.z, t),
    };
  }
  return out;
}
