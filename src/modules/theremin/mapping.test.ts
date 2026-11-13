import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  heightToLevel,
  heightToMidi,
  heightToVolume,
  levelToHeight,
  MAX_MIDI,
  midiToFrequency,
  midiToNoteName,
  MIN_MIDI,
} from "./mapping.ts";

describe("theremin mapping", () => {
  it("a higher hand gives a higher pitch", () => {
    assert.ok(heightToMidi(0.3) > heightToMidi(0.6));
  });

  it("clamps pitch to the playable range", () => {
    assert.equal(heightToMidi(1), MIN_MIDI);
    assert.equal(heightToMidi(0), MAX_MIDI);
  });

  it("a higher hand is louder, silent at the bottom, full at the top", () => {
    assert.equal(heightToVolume(0.95), 0);
    assert.equal(heightToVolume(0.05), 1);
    assert.ok(heightToVolume(0.3) > heightToVolume(0.6));
  });

  it("levelToHeight is the inverse of heightToLevel", () => {
    for (const y of [0.2, 0.5, 0.8]) {
      assert.ok(Math.abs(levelToHeight(heightToLevel(y)) - y) < 1e-9);
    }
  });

  it("names notes and converts to frequency", () => {
    assert.equal(midiToNoteName(69), "A4");
    assert.equal(midiToNoteName(60.4), "C4");
    assert.equal(midiToNoteName(48), "C3");
    assert.equal(midiToFrequency(69), 440);
  });
});
