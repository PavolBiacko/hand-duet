import { useSettingsStore } from "@/store/settings";
import type { InstrumentModule } from "../types";
import { ChordsController, OCTAVES } from "./controller";
import ChordsControls from "./Controls";
import { renderChords } from "./render";
import { ChordsSynth } from "./synth";
import { chordMidi } from "./theory";

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
 * Chords: the left hand's shape picks a chord, and the chord sounds at full
 * volume for as long as the right hand is on screen. See ChordsController for
 * the exact mapping. Key and scale come from the settings.
 */
export const chordsModule: InstrumentModule = {
  id: "chords",
  name: "Chords",
  icon: "🎹",
  Controls: ChordsControls,

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
      const { chordKey, chordScale } = useSettingsStore.getState();
      synth?.hold(
        chordMidi({
          key: chordKey,
          scale: chordScale,
          degree,
          flipped,
          octave: OCTAVES[octaveIndex],
        }),
      );
    } else {
      // No right hand (or tracking lost) means silence.
      synth?.silence();
    }
  },

  render(canvas) {
    const { chordKey, chordScale } = useSettingsStore.getState();
    renderChords(canvas, { state: controller.state, key: chordKey, scale: chordScale });
  },

  onExit() {
    window.removeEventListener("keydown", onKeyDown);
    synth?.dispose();
    synth = null;
  },
};
