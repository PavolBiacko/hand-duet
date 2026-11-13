import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  chordMidi,
  chordName,
  chordQuality,
  isKeyName,
  isScaleName,
  midiToFrequency,
  romanNumeral,
} from "./theory.ts";

const DEGREES = [1, 2, 3, 4, 5, 6, 7];

describe("chord theory", () => {
  it("follows the scale by default (C major)", () => {
    const names = DEGREES.map((d) => chordName("C", "major", d, false));
    assert.deepEqual(names, ["C", "Dm", "Em", "F", "G", "Am", "B°"]);
  });

  it("supports minor scales (A minor)", () => {
    const names = DEGREES.map((d) => chordName("A", "minor", d, false));
    assert.deepEqual(names, ["Am", "B°", "C", "Dm", "Em", "F", "G"]);
  });

  it("works in other keys, with the usual note spellings", () => {
    assert.deepEqual(
      [1, 4, 5, 6].map((d) => chordName("G", "major", d, false)),
      ["G", "C", "D", "Em"],
    );
    assert.deepEqual(
      [1, 4, 5].map((d) => chordName("F", "major", d, false)),
      ["F", "Bb", "C"],
    );
    assert.deepEqual(
      [1, 3, 6].map((d) => chordName("C", "minor", d, false)),
      ["Cm", "Eb", "Ab"],
    );
  });

  it("flipping swaps major and minor", () => {
    assert.equal(chordName("C", "major", 1, true), "Cm");
    assert.equal(chordName("C", "major", 2, true), "D");
    assert.equal(chordQuality("major", 7, true), "minor");
    assert.equal(chordName("A", "minor", 1, true), "A");
  });

  it("builds the right notes", () => {
    // C major in octave 4: C4 E4 G4 C5
    assert.deepEqual(
      chordMidi({ key: "C", scale: "major", degree: 1, flipped: false, octave: 4 }),
      [60, 64, 67, 72],
    );
    // A minor (vi of C major): A4 C5 E5 A5
    assert.deepEqual(
      chordMidi({ key: "C", scale: "major", degree: 6, flipped: false, octave: 4 }),
      [69, 72, 76, 81],
    );
    // B diminished (vii): B D F
    assert.deepEqual(
      chordMidi({ key: "C", scale: "major", degree: 7, flipped: false, octave: 3 }).slice(0, 3),
      [59, 62, 65],
    );
    // A minor, degree III = C major: C5 E5 G5
    assert.deepEqual(
      chordMidi({ key: "A", scale: "minor", degree: 3, flipped: false, octave: 4 }).slice(0, 3),
      [72, 76, 79],
    );
  });

  it("writes roman numerals in the usual case convention", () => {
    assert.equal(romanNumeral("major", 4, false), "IV");
    assert.equal(romanNumeral("major", 2, false), "ii");
    assert.equal(romanNumeral("major", 7, false), "vii°");
    assert.equal(romanNumeral("major", 1, true), "i");
    assert.deepEqual(
      DEGREES.map((d) => romanNumeral("minor", d, false)),
      ["i", "ii°", "III", "iv", "v", "VI", "VII"],
    );
  });

  it("validates key and scale names", () => {
    assert.equal(isKeyName("Eb"), true);
    assert.equal(isKeyName("H"), false);
    assert.equal(isScaleName("minor"), true);
    assert.equal(isScaleName("dorian"), false);
  });

  it("converts MIDI to frequency", () => {
    assert.equal(midiToFrequency(69), 440);
    assert.ok(Math.abs(midiToFrequency(60) - 261.626) < 0.01);
  });
});
