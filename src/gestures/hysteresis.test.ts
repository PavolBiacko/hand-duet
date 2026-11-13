import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Debounced, schmitt } from "./hysteresis.ts";

describe("schmitt", () => {
  it("switches on above the on threshold and off below the off threshold", () => {
    assert.equal(schmitt(false, 0.9, 0.8, 0.6), true);
    assert.equal(schmitt(true, 0.5, 0.8, 0.6), false);
  });

  it("keeps its state between the thresholds", () => {
    assert.equal(schmitt(false, 0.7, 0.8, 0.6), false);
    assert.equal(schmitt(true, 0.7, 0.8, 0.6), true);
  });

  it("does not flicker on a value jittering around one threshold", () => {
    let state = false;
    let changes = 0;
    for (const v of [0.79, 0.81, 0.79, 0.81, 0.78, 0.82]) {
      const next = schmitt(state, v, 0.8, 0.6);
      if (next !== state) changes++;
      state = next;
    }
    assert.equal(changes, 1);
  });
});

describe("Debounced", () => {
  it("accepts the first value immediately", () => {
    assert.equal(new Debounced<number>(100).update(3, 0), 3);
  });

  it("holds the old value until the new one has lasted long enough", () => {
    const d = new Debounced<number>(100);
    d.update(1, 0);
    assert.equal(d.update(2, 10), 1);
    assert.equal(d.update(2, 60), 1);
    assert.equal(d.update(2, 110), 2);
  });

  it("restarts the timer when the candidate changes", () => {
    const d = new Debounced<number>(100);
    d.update(1, 0);
    d.update(2, 10);
    assert.equal(d.update(3, 105), 1);
    assert.equal(d.update(3, 150), 1);
    assert.equal(d.update(3, 210), 3);
  });
});
