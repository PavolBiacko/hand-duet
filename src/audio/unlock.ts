import * as Tone from "tone";

/**
 * Browsers only allow sound after a user gesture. Call this from a click
 * handler (the Start button) so modules can make sound later.
 */
export function unlockAudio(): void {
  Tone.start().catch((err) => console.warn("[audio] could not start", err));
}
