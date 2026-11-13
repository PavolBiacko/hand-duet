import * as Tone from "tone";
import { midiToFrequency } from "./theory";

export const DEFAULT_BPM = 100;
/** Delay between the notes of one strum, in seconds. */
const STRUM_SPREAD = 0.014;

/** Tone.js side of the Chords module: one polyphonic synth on a beat grid. */
export class ChordsSynth {
  private synth: Tone.PolySynth | null = null;
  private nodes: Tone.ToneAudioNode[] = [];

  async init(bpm = DEFAULT_BPM): Promise<void> {
    await Tone.start();

    const limiter = new Tone.Limiter(-3).toDestination();
    const reverb = new Tone.Reverb({ decay: 2.2, wet: 0.22 }).connect(limiter);
    await reverb.ready;
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle8" },
      envelope: { attack: 0.004, decay: 0.5, sustain: 0.2, release: 1.4 },
      volume: -10,
    }).connect(reverb);
    synth.maxPolyphony = 24;

    this.synth = synth;
    this.nodes = [synth, reverb, limiter];

    const transport = Tone.getTransport();
    transport.bpm.value = bpm;
    transport.start();
  }

  /**
   * Plays a chord on the next 8th note of the beat grid, so strums land in
   * time even though hand tracking adds some delay.
   *
   * @returns how many milliseconds from now the chord will sound
   */
  play(midiNotes: readonly number[], strength: number): number {
    const synth = this.synth;
    if (!synth) return 0;
    const now = Tone.now();
    const time = Math.max(Tone.getTransport().nextSubdivision("8n"), now + 0.01);
    const velocity = 0.35 + 0.65 * Math.min(1, Math.max(0, strength));

    // Let the previous chord go so chords do not pile up into mud.
    synth.releaseAll(time);
    midiNotes.forEach((midi, i) => {
      synth.triggerAttackRelease(
        midiToFrequency(midi),
        "2n",
        time + 0.001 + i * STRUM_SPREAD,
        velocity,
      );
    });
    return (time - now) * 1000;
  }

  /** Position inside the current beat, 0..1 (for the beat indicator). */
  beatPhase(): number {
    const transport = Tone.getTransport();
    const beats = (transport.seconds * transport.bpm.value) / 60;
    return beats - Math.floor(beats);
  }

  silence(): void {
    this.synth?.releaseAll();
  }

  dispose(): void {
    this.silence();
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    this.nodes.forEach((node) => node.dispose());
    this.nodes = [];
    this.synth = null;
  }
}
