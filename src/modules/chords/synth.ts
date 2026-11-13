import * as Tone from "tone";

/** Input range (in multiples of full scale) the soft clipper can absorb. */
const CLIP_RANGE = 4;
/** Drive into the soft clipper. Higher = louder and slightly more saturated. */
const DRIVE = 2.5;

/**
 * Tone.js side of the Chords module: a pad that holds a chord for as long as
 * it is told to, at full volume.
 */
export class ChordsSynth {
  private synth: Tone.PolySynth | null = null;
  private nodes: Tone.ToneAudioNode[] = [];
  private held: number[] = [];

  async init(): Promise<void> {
    await Tone.start();

    // synth -> filter -> soft clip -> reverb -> speakers.
    // The soft clip (a tanh curve) is the limiter: it lets the chord run as
    // loud as possible while guaranteeing the signal never exceeds full scale.
    const master = new Tone.Gain(0.9).toDestination();
    const reverb = new Tone.Reverb({ decay: 2.2, wet: 0.2 }).connect(master);
    await reverb.ready;
    const clip = new Tone.WaveShaper((x) => Math.tanh(x * CLIP_RANGE), 4096).connect(reverb);
    clip.oversample = "2x";
    const drive = new Tone.Gain(DRIVE / CLIP_RANGE).connect(clip);
    const filter = new Tone.Filter({ type: "lowpass", frequency: 2400, Q: 0.7 }).connect(drive);
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "fatsawtooth", count: 3, spread: 16 },
      envelope: { attack: 0.03, decay: 0.2, sustain: 0.9, release: 0.35 },
      volume: -12,
    }).connect(filter);
    synth.maxPolyphony = 16;

    this.synth = synth;
    this.nodes = [synth, filter, drive, clip, reverb, master];
  }

  /**
   * Holds the given chord (MIDI notes). Calling it again with the same notes
   * does nothing; with different notes only the changed ones are swapped.
   */
  hold(midiNotes: readonly number[]): void {
    const synth = this.synth;
    if (!synth) return;
    const next = [...midiNotes];
    const stop = this.held.filter((n) => !next.includes(n));
    const start = next.filter((n) => !this.held.includes(n));
    if (stop.length) synth.triggerRelease(stop.map(toNote));
    if (start.length) synth.triggerAttack(start.map(toNote), undefined, 1);
    this.held = next;
  }

  /** Lets the chord fade out. */
  silence(): void {
    if (this.held.length === 0) return;
    this.synth?.releaseAll();
    this.held = [];
  }

  dispose(): void {
    this.silence();
    const nodes = this.nodes;
    this.nodes = [];
    this.synth = null;
    // Dispose after the release so switching away does not click.
    setTimeout(() => nodes.forEach((node) => node.dispose()), 500);
  }
}

function toNote(midi: number): string {
  return Tone.Frequency(midi, "midi").toNote();
}
