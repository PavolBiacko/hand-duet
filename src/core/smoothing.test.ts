import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { openLeft, openRight } from "../gestures/__fixtures__/hands.ts";
import { HandSmoother, OneEuroFilter } from "./smoothing.ts";
import type { TrackedHand } from "./types.ts";

function variance(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
}

/** Deterministic pseudo-random noise in [-1, 1]. */
function noise(i: number): number {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

describe("OneEuroFilter", () => {
  it("returns the first value unchanged", () => {
    assert.equal(new OneEuroFilter(1.5, 8).filter(0.42, 0), 0.42);
  });

  it("reduces jitter on a still signal", () => {
    const filter = new OneEuroFilter(1.5, 8);
    const raw: number[] = [];
    const out: number[] = [];
    for (let i = 0; i < 120; i++) {
      const v = 0.5 + noise(i) * 0.004;
      raw.push(v);
      out.push(filter.filter(v, i / 30));
    }
    assert.ok(variance(out.slice(30)) < variance(raw.slice(30)) * 0.25);
  });

  it("follows fast movement with little lag", () => {
    const filter = new OneEuroFilter(1.5, 8);
    let out = 0;
    // 2 units per second for half a second.
    for (let i = 0; i <= 15; i++) out = filter.filter((i / 30) * 2, i / 30);
    assert.ok(Math.abs(out - 1) < 0.08, `lag was ${Math.abs(out - 1)}`);
  });
});

describe("HandSmoother", () => {
  const flip = (hand: TrackedHand): TrackedHand => ({
    ...hand,
    handedness: hand.handedness === "Left" ? "Right" : "Left",
  });

  it("passes the first frame through unchanged", () => {
    const [hand] = new HandSmoother().apply([openRight], 0);
    assert.deepEqual(hand.landmarks, openRight.landmarks);
    assert.equal(hand.handedness, "Right");
  });

  it("ignores a single frame with the wrong handedness", () => {
    const smoother = new HandSmoother();
    for (let i = 0; i < 10; i++) smoother.apply([openRight], i * 33);
    const [hand] = smoother.apply([flip(openRight)], 330);
    assert.equal(hand.handedness, "Right");
  });

  it("accepts a handedness change that persists", () => {
    const smoother = new HandSmoother();
    for (let i = 0; i < 10; i++) smoother.apply([openRight], i * 33);
    let hand = openRight;
    for (let i = 10; i < 30; i++) [hand] = smoother.apply([flip(openRight)], i * 33);
    assert.equal(hand.handedness, "Left");
  });

  it("keeps two hands apart even if their order changes", () => {
    const smoother = new HandSmoother();
    smoother.apply([openLeft, openRight], 0);
    const [a, b] = smoother.apply([openRight, openLeft], 33);
    assert.equal(a.handedness, "Right");
    assert.equal(b.handedness, "Left");
    assert.ok(Math.abs(a.landmarks[0].x - openRight.landmarks[0].x) < 1e-9);
    assert.ok(Math.abs(b.landmarks[0].x - openLeft.landmarks[0].x) < 1e-9);
  });

  it("starts fresh after a hand has been gone for a while", () => {
    const smoother = new HandSmoother();
    smoother.apply([openRight], 0);
    const far: TrackedHand = {
      ...openRight,
      landmarks: openRight.landmarks.map((p) => ({ ...p, y: p.y + 0.2 })),
    };
    const [hand] = smoother.apply([far], 1000);
    assert.deepEqual(hand.landmarks, far.landmarks);
  });
});
