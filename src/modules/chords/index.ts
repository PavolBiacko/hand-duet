import type { InstrumentModule } from "../types";
import { ChordsController, OCTAVES, type PlayCommand } from "./controller";
import { renderChords } from "./render";
import { ChordsSynth } from "./synth";
import { chordMidi, type KeyName } from "./theory";

/** Audio is silenced when no hand has been seen for this long. */
const SILENCE_AFTER_MS = 600;

const KEY: KeyName = "C";

let controller = new ChordsController();
let synth: ChordsSynth | null = null;
let lastPlayedAt = -Infinity;
let lastHandsAt = 0;
let silenced = false;

function play(command: PlayCommand): void {
  if (!synth) return;
  const notes = chordMidi({
    key: KEY,
    degree: command.degree,
    flipped: command.flipped,
    octave: OCTAVES[command.octaveIndex],
  });
  const delayMs = synth.play(notes, command.strength);
  lastPlayedAt = performance.now() + delayMs;
  silenced = false;
}

/** Keyboard fallback: 1-7 pick the chord, Space strums. Handy without a camera. */
function onKeyDown(event: KeyboardEvent): void {
  if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest("input, textarea, select, [contenteditable]")) return;
  if (event.key >= "1" && event.key <= "7") {
    controller.setDegree(Number(event.key));
  } else if (event.code === "Space") {
    // On a focused button Space means "press the button"; leave that alone.
    if (target?.closest("button, a")) return;
    event.preventDefault();
    play({ ...controller.state, strength: 0.6 });
  }
}

/**
 * Chords: the left hand chooses a chord, the right hand strums it.
 * See ChordsController for the exact gesture mapping.
 */
export const chordsModule: InstrumentModule = {
  id: "chords",
  name: "Chords",
  icon: "🎸",

  async onEnter() {
    controller = new ChordsController();
    lastPlayedAt = -Infinity;
    lastHandsAt = performance.now();
    silenced = false;
    const next = new ChordsSynth();
    await next.init();
    synth = next;
    window.addEventListener("keydown", onKeyDown);
  },

  onFrame(hands, gestures, context) {
    if (gestures.left || gestures.right) {
      lastHandsAt = context.timestamp;
    } else if (!silenced && context.timestamp - lastHandsAt > SILENCE_AFTER_MS) {
      // Tracking lost: let everything ring out instead of droning on.
      synth?.silence();
      silenced = true;
    }
    const command = controller.update(gestures);
    if (command) play(command);
  },

  render(canvas) {
    renderChords(canvas, {
      state: controller.state,
      key: KEY,
      lastPlayedAt,
      beatPhase: synth?.beatPhase() ?? 0,
    });
  },

  onExit() {
    window.removeEventListener("keydown", onKeyDown);
    synth?.dispose();
    synth = null;
  },
};
