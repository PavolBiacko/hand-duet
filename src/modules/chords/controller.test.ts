import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FingerName, GestureFrame, HandGesture } from "../../gestures/types.ts";
import {
  ChordsController,
  DEGREE_SHAPES,
  degreeFromHand,
  HOLD_MS,
} from "./controller.ts";

function hand(
  handedness: "Left" | "Right",
  extended: FingerName[],
  overrides: Partial<HandGesture> = {},
): HandGesture {
  const fingers = { thumb: false, index: false, middle: false, ring: false, pinky: false };
  for (const f of extended) fingers[f] = true;
  return {
    handedness,
    fingers,
    fingerCount: extended.length,
    pinch: false,
    pinchStrength: 0,
    fist: extended.length === 0,
    tilt: 0,
    x: handedness === "Left" ? 0.25 : 0.75,
    y: 0.5,
    vx: 0,
    vy: 0,
    ...overrides,
  };
}

function frame(parts: Partial<GestureFrame>): GestureFrame {
  return { left: null, right: null, events: [], timestamp: 0, ...parts };
}

describe("degreeFromHand", () => {
  it("maps hand shapes to the seven degrees", () => {
    assert.equal(degreeFromHand(hand("Left", ["index"])), 1);
    assert.equal(degreeFromHand(hand("Left", ["index", "middle"])), 2);
    assert.equal(degreeFromHand(hand("Left", ["index", "middle", "ring"])), 3);
    assert.equal(degreeFromHand(hand("Left", ["index", "middle", "ring", "pinky"])), 4);
    assert.equal(degreeFromHand(hand("Left", ["thumb", "index", "middle", "ring", "pinky"])), 5);
    assert.equal(degreeFromHand(hand("Left", ["thumb"])), 6);
    assert.equal(degreeFromHand(hand("Left", ["thumb", "index"])), 7);
  });

  it("returns null for a fist", () => {
    assert.equal(degreeFromHand(hand("Left", [])), null);
  });
});

describe("ChordsController", () => {
  it("plays as soon as the right hand is visible, with the left hand's chord", () => {
    const c = new ChordsController();
    const state = c.update(
      frame({
        left: hand("Left", ["index", "middle", "ring", "pinky"]),
        right: hand("Right", []),
        timestamp: 1000,
      }),
    );
    assert.equal(state.active, true);
    assert.equal(state.degree, 4);
  });

  it("is silent without the right hand, even if the left hand shows a chord", () => {
    const c = new ChordsController();
    assert.equal(c.update(frame({ timestamp: 0 })).active, false);
    const state = c.update(frame({ left: hand("Left", ["index", "middle"]), timestamp: 33 }));
    assert.equal(state.active, false);
    assert.equal(state.degree, 2, "the chord is still selected");
  });

  it("needs no strum, and a strum changes nothing", () => {
    const c = new ChordsController();
    const still = c.update(frame({ right: hand("Right", ["index"]), timestamp: 0 }));
    assert.equal(still.active, true);
    const strummed = c.update(
      frame({
        right: hand("Right", ["index"]),
        events: [{ type: "strum", hand: "Right", direction: "down", strength: 1 }],
        timestamp: 33,
      }),
    );
    assert.equal(strummed.active, true);
  });

  it("holds through a short tracking dropout, then goes silent", () => {
    const c = new ChordsController();
    c.update(frame({ right: hand("Right", []), timestamp: 1000 }));
    assert.equal(c.update(frame({ timestamp: 1100 })).active, true);
    assert.equal(c.update(frame({ timestamp: 1000 + HOLD_MS + 1 })).active, false);
    assert.equal(c.update(frame({ right: hand("Right", []), timestamp: 2000 })).active, true);
  });

  it("keeps the last chord when the left hand makes a fist or disappears", () => {
    const c = new ChordsController();
    c.update(frame({ left: hand("Left", ["index", "middle"]), right: hand("Right", []), timestamp: 0 }));
    assert.equal(c.update(frame({ left: hand("Left", []), right: hand("Right", []), timestamp: 33 })).degree, 2);
    const state = c.update(frame({ right: hand("Right", []), timestamp: 66 }));
    assert.equal(state.degree, 2);
    assert.equal(state.active, true);
  });

  it("the legend shapes match what the controller recognises", () => {
    DEGREE_SHAPES.forEach((shape, i) => {
      const names = (["thumb", "index", "middle", "ring", "pinky"] as const).filter(
        (_, f) => shape.fingers[f],
      );
      assert.equal(degreeFromHand(hand("Left", [...names])), i + 1);
    });
  });

  it("flips major/minor with tilt, with hysteresis", () => {
    const c = new ChordsController();
    const tilted = (deg: number) =>
      frame({ left: hand("Left", ["index"], { tilt: (deg * Math.PI) / 180 }) });
    c.update(tilted(30));
    assert.equal(c.state.flipped, false, "30° is not enough to flip");
    c.update(tilted(-40));
    assert.equal(c.state.flipped, true, "either direction flips");
    c.update(tilted(28));
    assert.equal(c.state.flipped, true, "stays flipped inside the hysteresis band");
    c.update(tilted(10));
    assert.equal(c.state.flipped, false);
  });

  it("picks the octave from the right hand's sideways position", () => {
    const c = new ChordsController();
    const at = (x: number) => frame({ right: hand("Right", [], { x }) });
    c.update(at(0.55));
    assert.equal(c.state.octaveIndex, 0);
    c.update(at(0.75));
    assert.equal(c.state.octaveIndex, 1);
    c.update(at(0.95));
    assert.equal(c.state.octaveIndex, 2);
    c.update(at(0.3));
    assert.equal(c.state.octaveIndex, 0, "far left jumps straight to low");
  });

  it("does not flicker between octaves at a zone edge", () => {
    const c = new ChordsController();
    const at = (x: number) => frame({ right: hand("Right", [], { x }) });
    c.update(at(0.75));
    for (const x of [0.83, 0.84, 0.83, 0.845, 0.825]) c.update(at(x));
    assert.equal(c.state.octaveIndex, 1);
    c.update(at(0.86));
    assert.equal(c.state.octaveIndex, 2);
    for (const x of [0.83, 0.82, 0.835]) c.update(at(x));
    assert.equal(c.state.octaveIndex, 2);
  });
});
