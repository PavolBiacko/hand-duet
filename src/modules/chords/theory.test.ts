import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  chordMidi,
  chordName,
  chordQuality,
  midiToFrequency,
  romanNumeral,
} from "./theory.ts";

describe("chord theory", () => {
  it("follows the key by default (C major)", () => {
    const names = [1, 2, 3, 4, 5, 6, 7].map((d) => chordName("C", d, false));
    assert.deepEqual(names, ["C", "Dm", "Em", "F", "G", "Am", "B°"]);
  });

  it("flipping swaps major and minor", () => {
    assert.equal(chordName("C", 1, true), "Cm");
    assert.equal(chordName("C", 2, true), "D");
    assert.equal(chordQuality(7, true), "minor");
  });

  it("works in other keys", () => {
    const names = [1, 4, 5, 6].map((d) => chordName("G", d, false));
    assert.deepEqual(names, ["G", "C", "D", "Em"]);
  });

  it("builds the right notes", () => {
    // C major in octave 4: C4 E4 G4 C5
    assert.deepEqual(chordMidi({ key: "C", degree: 1, flipped: false, octave: 4 }), [60, 64, 67, 72]);
    // A minor (vi): A4 C5 E5 A5
    assert.deepEqual(chordMidi({ key: "C", degree: 6, flipped: false, octave: 4 }), [69, 72, 76, 81]);
    // B diminished (vii): B D F
    assert.deepEqual(chordMidi({ key: "C", degree: 7, flipped: false, octave: 3 }).slice(0, 3), [59, 62, 65]);
  });

  it("writes roman numerals in the usual case convention", () => {
    assert.equal(romanNumeral(4, false), "IV");
    assert.equal(romanNumeral(2, false), "ii");
    assert.equal(romanNumeral(7, false), "vii°");
    assert.equal(romanNumeral(1, true), "i");
  });

  it("converts MIDI to frequency", () => {
    assert.equal(midiToFrequency(69), 440);
    assert.ok(Math.abs(midiToFrequency(60) - 261.626) < 0.01);
  });
});
