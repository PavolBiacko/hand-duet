import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TrackedHand } from "../core/types.ts";
import { GestureEngine } from "./engine.ts";
import {
  fist,
  openLeft,
  openRight,
  pointingUp,
  thumbUp,
  victory,
} from "./__fixtures__/hands.ts";
import type { GestureEvent } from "./types.ts";

const ASPECT = 16 / 9;

/** Returns a copy of the hand moved by (dx, dy) in display space. */
function moved(hand: TrackedHand, dx: number, dy: number): TrackedHand {
  return {
    ...hand,
    landmarks: hand.landmarks.map((p) => ({ x: p.x + dx, y: p.y + dy, z: p.z })),
  };
}

/** Returns a copy with thumb and index fingertips brought together. */
function pinched(hand: TrackedHand): TrackedHand {
  const world = hand.worldLandmarks.map((p) => ({ ...p }));
  world[4] = { ...world[8], x: world[8].x + 0.005 };
  return { ...hand, worldLandmarks: world };
}

function settle(engine: GestureEngine, hand: TrackedHand, from = 0, frames = 10) {
  let result = engine.update([hand], from, ASPECT);
  for (let i = 1; i < frames; i++) {
    result = engine.update([hand], from + i * 33, ASPECT);
  }
  return result;
}

describe("finger detection (real landmarks)", () => {
  const cases: [string, TrackedHand, number, string[]][] = [
    ["fist", fist, 0, []],
    ["thumb up", thumbUp, 1, ["thumb"]],
    ["pointing up", pointingUp, 1, ["index"]],
    ["victory", victory, 2, ["index", "middle"]],
    ["open right hand", openRight, 5, ["thumb", "index", "middle", "ring", "pinky"]],
    ["open left hand", openLeft, 5, ["thumb", "index", "middle", "ring", "pinky"]],
  ];
  for (const [name, hand, count, extended] of cases) {
    it(`${name}: ${count} finger(s)`, () => {
      const frame = settle(new GestureEngine(), hand);
      const g = hand.handedness === "Left" ? frame.left : frame.right;
      assert.ok(g, "hand should be reported");
      assert.equal(g.fingerCount, count);
      const up = Object.entries(g.fingers)
        .filter(([, v]) => v)
        .map(([k]) => k);
      assert.deepEqual(up, extended);
    });
  }

  it("reports hands on the correct side", () => {
    const frame = new GestureEngine().update([openLeft, openRight], 0, ASPECT);
    assert.equal(frame.left?.handedness, "Left");
    assert.equal(frame.right?.handedness, "Right");
  });

  it("returns null for a hand that is not visible", () => {
    const frame = new GestureEngine().update([openRight], 0, ASPECT);
    assert.equal(frame.left, null);
    assert.ok(frame.right);
  });
});

describe("fist and pinch", () => {
  it("detects a fist, and not on other poses", () => {
    assert.equal(settle(new GestureEngine(), fist).right?.fist, true);
    assert.equal(settle(new GestureEngine(), thumbUp).right?.fist, true);
    assert.equal(settle(new GestureEngine(), victory).right?.fist, false);
    assert.equal(settle(new GestureEngine(), openRight).right?.fist, false);
  });

  it("a fist is never a pinch", () => {
    assert.equal(settle(new GestureEngine(), fist).right?.pinch, false);
  });

  it("detects a pinch and emits start/end events once", () => {
    const engine = new GestureEngine();
    const events: GestureEvent[] = [];
    let t = 0;
    const feed = (hand: TrackedHand, frames: number) => {
      for (let i = 0; i < frames; i++, t += 33) {
        events.push(...engine.update([hand], t, ASPECT).events);
      }
    };
    feed(openRight, 5);
    feed(pinched(openRight), 5);
    feed(openRight, 5);
    const pinchEvents = events.filter((e) => e.type.startsWith("pinch"));
    assert.deepEqual(
      pinchEvents.map((e) => e.type),
      ["pinchStart", "pinchEnd"],
    );
  });
});

describe("finger count debouncing", () => {
  it("ignores a count that only appears for one frame", () => {
    const engine = new GestureEngine();
    settle(engine, pointingUp, 0, 10); // t = 0..297
    const blip = engine.update([{ ...victory }], 330, ASPECT);
    assert.equal(blip.right?.fingerCount, 1, "single-frame change is held back");
    const back = engine.update([pointingUp], 363, ASPECT);
    assert.equal(back.right?.fingerCount, 1);
  });

  it("accepts a new count once it is held", () => {
    const engine = new GestureEngine();
    settle(engine, pointingUp, 0, 10);
    const frame = settle(engine, victory, 330, 6);
    assert.equal(frame.right?.fingerCount, 2);
  });

  it("emits a fingerCount event only when the count changes", () => {
    const engine = new GestureEngine();
    const events: GestureEvent[] = [];
    for (let i = 0; i < 10; i++) {
      events.push(...engine.update([victory], i * 33, ASPECT).events);
    }
    const counts = events.filter((e) => e.type === "fingerCount");
    assert.equal(counts.length, 1);
    assert.deepEqual(counts[0], { type: "fingerCount", hand: "Right", count: 2 });
  });
});

describe("position, tilt and strum", () => {
  it("reports the palm position in display space", () => {
    const g = new GestureEngine().update([openRight], 0, ASPECT).right;
    assert.ok(g);
    assert.ok(g.x > 0 && g.x < 1 && g.y > 0 && g.y < 1);
    const shifted = new GestureEngine().update([moved(openRight, 0.1, -0.05)], 0, ASPECT).right;
    assert.ok(shifted);
    assert.ok(Math.abs(shifted.x - g.x - 0.1) < 1e-6);
    assert.ok(Math.abs(shifted.y - g.y + 0.05) < 1e-6);
  });

  it("tilt is ~0 for an upright hand and signed by lean direction", () => {
    const upright: TrackedHand = {
      ...openRight,
      landmarks: openRight.landmarks.map((p, i) =>
        i === 0 ? { x: 0.5, y: 0.8, z: 0 } : i === 9 ? { x: 0.5, y: 0.6, z: 0 } : p,
      ),
    };
    const right: TrackedHand = {
      ...upright,
      landmarks: upright.landmarks.map((p, i) => (i === 9 ? { x: 0.6, y: 0.6, z: 0 } : p)),
    };
    const engine = new GestureEngine();
    assert.ok(Math.abs(engine.update([upright], 0, 1).right!.tilt) < 1e-9);
    assert.ok(engine.update([right], 33, 1).right!.tilt > 0.3);
  });

  it("emits one down strum for a fast downward flick", () => {
    const engine = new GestureEngine();
    const events: GestureEvent[] = [];
    let t = 0;
    let y = -0.3;
    // Hold still, then move 0.4 screen heights in ~130 ms (3 screen heights/s), then stop.
    for (let i = 0; i < 5; i++, t += 33) {
      events.push(...engine.update([moved(openRight, 0, y)], t, ASPECT).events);
    }
    for (let i = 0; i < 4; i++, t += 33) {
      y += 0.1;
      events.push(...engine.update([moved(openRight, 0, y)], t, ASPECT).events);
    }
    for (let i = 0; i < 10; i++, t += 33) {
      events.push(...engine.update([moved(openRight, 0, y)], t, ASPECT).events);
    }
    const strums = events.filter((e) => e.type === "strum");
    assert.equal(strums.length, 1);
    assert.equal(strums[0].type === "strum" && strums[0].direction, "down");
    assert.equal(strums[0].hand, "Right");
  });

  it("does not strum on slow movement", () => {
    const engine = new GestureEngine();
    const events: GestureEvent[] = [];
    for (let i = 0; i < 30; i++) {
      events.push(
        ...engine.update([moved(openRight, 0, -0.3 + i * 0.01)], i * 33, ASPECT).events,
      );
    }
    assert.equal(events.filter((e) => e.type === "strum").length, 0);
  });

  it("does not strum when a hand reappears somewhere else", () => {
    const engine = new GestureEngine();
    settle(engine, moved(openRight, 0, -0.3), 0, 5);
    const events = engine.update([moved(openRight, 0, 0.2)], 2000, ASPECT).events;
    assert.equal(events.filter((e) => e.type === "strum").length, 0);
  });
});
