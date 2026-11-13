/** Chord maths for the Chords module. Pure functions, no audio. */

/** The twelve keys, named the way they are usually written. */
export const KEYS = [
  "C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B",
] as const;
export type KeyName = (typeof KEYS)[number];

export const SCALES = ["major", "minor"] as const;
export type ScaleName = (typeof SCALES)[number];

export type Quality = "major" | "minor" | "diminished";

interface ScaleDefinition {
  /** Semitones above the key note for degrees I..VII. */
  steps: readonly number[];
  /** Chord quality each degree naturally has in this scale. */
  qualities: readonly Quality[];
}

const SCALE_DEFINITIONS: Record<ScaleName, ScaleDefinition> = {
  major: {
    steps: [0, 2, 4, 5, 7, 9, 11],
    qualities: ["major", "minor", "minor", "major", "major", "minor", "diminished"],
  },
  // Natural minor
  minor: {
    steps: [0, 2, 3, 5, 7, 8, 10],
    qualities: ["minor", "diminished", "major", "minor", "minor", "major", "major"],
  },
};

const TRIADS: Record<Quality, readonly number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
};

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

export interface ChordSpec {
  key: KeyName;
  scale: ScaleName;
  /** Scale degree, 1..7 */
  degree: number;
  /** Swap major <-> minor relative to what the scale normally gives. */
  flipped: boolean;
  /** Octave of the key note (4 = middle C octave). */
  octave: number;
}

export function isKeyName(value: unknown): value is KeyName {
  return KEYS.includes(value as KeyName);
}

export function isScaleName(value: unknown): value is ScaleName {
  return SCALES.includes(value as ScaleName);
}

/**
 * Quality of a degree. By default chords follow the scale (in C major: C, Dm,
 * Em, F, G, Am, B dim); `flipped` swaps major and minor (a diminished chord
 * becomes minor).
 */
export function chordQuality(
  scale: ScaleName,
  degree: number,
  flipped: boolean,
): Quality {
  const natural = SCALE_DEFINITIONS[scale].qualities[degree - 1];
  if (!flipped) return natural;
  return natural === "major" ? "minor" : natural === "minor" ? "major" : "minor";
}

/** MIDI notes of the chord, low to high: triad plus the root an octave up. */
export function chordMidi(spec: ChordSpec): number[] {
  const { key, scale, degree, flipped, octave } = spec;
  const root =
    12 * (octave + 1) + KEYS.indexOf(key) + SCALE_DEFINITIONS[scale].steps[degree - 1];
  const triad = TRIADS[chordQuality(scale, degree, flipped)];
  return [...triad.map((interval) => root + interval), root + 12];
}

/** Chord name such as "C", "Dm" or "B°". */
export function chordName(
  key: KeyName,
  scale: ScaleName,
  degree: number,
  flipped: boolean,
): string {
  const pitchClass =
    (KEYS.indexOf(key) + SCALE_DEFINITIONS[scale].steps[degree - 1]) % 12;
  const quality = chordQuality(scale, degree, flipped);
  const suffix = quality === "major" ? "" : quality === "minor" ? "m" : "°";
  return KEYS[pitchClass] + suffix;
}

/** Roman numeral such as "IV", "ii" or "vii°". */
export function romanNumeral(
  scale: ScaleName,
  degree: number,
  flipped: boolean,
): string {
  const quality = chordQuality(scale, degree, flipped);
  const numeral = ROMAN[degree - 1];
  if (quality === "major") return numeral;
  return numeral.toLowerCase() + (quality === "diminished" ? "°" : "");
}

export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}
