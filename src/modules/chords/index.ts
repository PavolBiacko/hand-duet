import type { InstrumentModule } from "../types";
import { ChordsController, OCTAVES } from "./controller";
import { renderChords } from "./render";
import { ChordsSynth } from "./synth";
import { chordMidi, type KeyName } from "./theory";

const KEY: KeyName = "C";

let controller = new ChordsController();
let synth: ChordsSynth | null = null;

/** Keyboard fallback: 1-7 pick the chord. */
function onKeyDown(event: KeyboardEvent): void {
  if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest("input, textarea, select, [contenteditable]")) return;
  if (event.key >= "1" && event.key <= "7") {
    controller.setDegree(Number(event.key));
  }
}

/**
 * Chords: while the left hand is on screen its chord sounds at full volume;
 * without it there is silence. The hand's shape picks the chord; see
 * ChordsController for the mapping.
 */
export const chordsModule: InstrumentModule = {
  id: "chords",
  name: "Chords",
  icon: "🎹",

  async onEnter() {
    controller = new ChordsController();
    const next = new ChordsSynth();
    await next.init();
    synth = next;
    window.addEventListener("keydown", onKeyDown);
  },

  onFrame(_hands, gestures) {
    const { degree, flipped, octaveIndex, active } = controller.update(gestures);
    if (active) {
      synth?.hold(
        chordMidi({ key: KEY, degree, flipped, octave: OCTAVES[octaveIndex] }),
      );
    } else {
      // No left hand (or tracking lost) means silence.
      synth?.silence();
    }
  },

  render(canvas) {
    renderChords(canvas, { state: controller.state, key: KEY });
  },

  onExit() {
    window.removeEventListener("keydown", onKeyDown);
    synth?.dispose();
    synth = null;
  },
};
