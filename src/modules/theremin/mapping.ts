/** Pure mapping from hand positions to pitch and volume for the Theremin. */

/** Lowest and highest note (MIDI). C3 to C6: three octaves. */
export const MIN_MIDI = 48;
export const MAX_MIDI = 84;

/** The playable band of the screen (0 = top). Outside it values are clamped. */
const TOP = 0.12;
const BOTTOM = 0.88;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** 0 at the bottom of the playable band, 1 at the top. */
export function heightToLevel(y: number): number {
  return clamp01((BOTTOM - y) / (BOTTOM - TOP));
}

/** Inverse of heightToLevel: where on screen (y, 0..1) a level sits. */
export function levelToHeight(level: number): number {
  return BOTTOM - clamp01(level) * (BOTTOM - TOP);
}

/** Right hand height -> pitch as a (fractional) MIDI note. Higher hand = higher note. */
export function heightToMidi(y: number): number {
  return MIN_MIDI + heightToLevel(y) * (MAX_MIDI - MIN_MIDI);
}

/**
 * Left hand height -> volume 0..1. Higher hand = louder. The curve is squared
 * so the quiet end has finer control, the way loudness is heard.
 */
export function heightToVolume(y: number): number {
  const level = heightToLevel(y);
  return level * level;
}

export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** Name of the nearest note, e.g. "A4". */
export function midiToNoteName(midi: number): string {
  const rounded = Math.round(midi);
  return NOTE_NAMES[((rounded % 12) + 12) % 12] + (Math.floor(rounded / 12) - 1);
}
