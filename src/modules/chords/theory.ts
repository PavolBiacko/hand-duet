/** Chord maths for the Chords module. Pure functions, no audio. */

export const KEYS = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
] as const;
export type KeyName = (typeof KEYS)[number];

export type Quality = "major" | "minor" | "diminished";

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

/** Chord quality of each degree (I..VII) in a major key. */
const DIATONIC: readonly Quality[] = [
  "major", "minor", "minor", "major", "major", "minor", "diminished",
];

const TRIADS: Record<Quality, readonly number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
};

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

export interface ChordSpec {
  key: KeyName;
  /** Scale degree, 1..7 */
  degree: number;
  /** Swap major <-> minor relative to what the key normally gives. */
  flipped: boolean;
  /** Octave of the key's root note (4 = middle C octave). */
  octave: number;
}

/**
 * Quality of a degree. By default chords follow the key (in C: C, Dm, Em, F,
 * G, Am, B dim); `flipped` swaps major and minor (a diminished chord becomes
 * minor).
 */
export function chordQuality(degree: number, flipped: boolean): Quality {
  const natural = DIATONIC[degree - 1];
  if (!flipped) return natural;
  return natural === "major" ? "minor" : natural === "minor" ? "major" : "minor";
}

function rootPitchClass(key: KeyName, degree: number): number {
  return (KEYS.indexOf(key) + MAJOR_SCALE[degree - 1]) % 12;
}

/** MIDI notes of the chord, low to high: triad plus the root an octave up. */
export function chordMidi(spec: ChordSpec): number[] {
  const { key, degree, flipped, octave } = spec;
  const root = 12 * (octave + 1) + KEYS.indexOf(key) + MAJOR_SCALE[degree - 1];
  const triad = TRIADS[chordQuality(degree, flipped)];
  return [...triad.map((interval) => root + interval), root + 12];
}

/** Chord name such as "C", "Dm" or "B°". */
export function chordName(key: KeyName, degree: number, flipped: boolean): string {
  const quality = chordQuality(degree, flipped);
  const suffix = quality === "major" ? "" : quality === "minor" ? "m" : "°";
  return KEYS[rootPitchClass(key, degree)] + suffix;
}

/** Roman numeral such as "IV", "ii" or "vii°". */
export function romanNumeral(degree: number, flipped: boolean): string {
  const quality = chordQuality(degree, flipped);
  const numeral = ROMAN[degree - 1];
  if (quality === "major") return numeral;
  return numeral.toLowerCase() + (quality === "diminished" ? "°" : "");
}

export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}
