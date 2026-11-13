import * as Tone from "tone";
import type { InstrumentModule, ModuleCanvas } from "../types";
import {
  heightToMidi,
  heightToVolume,
  levelToHeight,
  MAX_MIDI,
  midiToFrequency,
  midiToNoteName,
  MIN_MIDI,
} from "./mapping";

/** Glide time for pitch and volume changes (seconds). Hides tracking steps. */
const GLIDE = 0.06;
/** Fade-out when a hand disappears (seconds). */
const FADE_OUT = 0.25;
const MAX_GAIN = 0.5;

let oscillator: Tone.Oscillator | null = null;
let gain: Tone.Gain | null = null;
let nodes: Tone.ToneAudioNode[] = [];

// Latest values, kept for drawing.
let midi: number | null = null;
let volume = 0;
let rightHand: { x: number; y: number } | null = null;
let leftHand: { x: number; y: number } | null = null;

/**
 * Theremin: right hand height sets the pitch, left hand height the volume.
 * Both hands must be visible to make sound.
 */
export const thereminModule: InstrumentModule = {
  id: "theremin",
  name: "Theremin",
  icon: "〰️",

  async onEnter() {
    await Tone.start();
    midi = null;
    volume = 0;
    rightHand = null;
    leftHand = null;

    const limiter = new Tone.Limiter(-3).toDestination();
    const reverb = new Tone.Reverb({ decay: 2.5, wet: 0.25 }).connect(limiter);
    await reverb.ready;
    const vibrato = new Tone.Vibrato({ frequency: 5.5, depth: 0.08 }).connect(reverb);
    gain = new Tone.Gain(0).connect(vibrato);
    oscillator = new Tone.Oscillator({ type: "sine", frequency: 440 }).connect(gain);
    oscillator.start();
    nodes = [oscillator, gain, vibrato, reverb, limiter];
  },

  onFrame(_hands, gestures) {
    if (!oscillator || !gain) return;
    const { left, right } = gestures;
    rightHand = right ? { x: right.x, y: right.y } : null;
    leftHand = left ? { x: left.x, y: left.y } : null;

    if (right) {
      midi = heightToMidi(right.y);
      oscillator.frequency.rampTo(midiToFrequency(midi), GLIDE);
    }
    if (left && right) {
      volume = heightToVolume(left.y);
      gain.gain.rampTo(volume * MAX_GAIN, GLIDE);
    } else if (volume !== 0) {
      // A hand is missing (or tracking was lost): fade to silence.
      volume = 0;
      gain.gain.rampTo(0, FADE_OUT);
    }
  },

  render(canvas) {
    renderTheremin(canvas);
  },

  onExit() {
    gain?.gain.rampTo(0, 0.05);
    const old = nodes;
    nodes = [];
    oscillator = null;
    gain = null;
    // Dispose after the short fade so switching away does not click.
    setTimeout(() => old.forEach((node) => node.dispose()), 150);
  },
};

const SANS = "ui-sans-serif, system-ui, sans-serif";
const PITCH_COLOR = "#fda4af";
const VOLUME_COLOR = "#5eead4";

function renderTheremin({ ctx, width, height }: ModuleCanvas): void {
  const unit = Math.min(width, height);
  ctx.save();
  ctx.textBaseline = "middle";

  // Pitch ruler on the right edge: one tick per C, labelled.
  const rulerX = width - unit * 0.03;
  ctx.font = `600 ${Math.round(unit * 0.02)}px ${SANS}`;
  ctx.textAlign = "right";
  for (let note = MIN_MIDI; note <= MAX_MIDI; note++) {
    const y = levelToHeight((note - MIN_MIDI) / (MAX_MIDI - MIN_MIDI)) * height;
    const isC = note % 12 === 0;
    ctx.strokeStyle = isC ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.25)";
    ctx.lineWidth = isC ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(rulerX, y);
    ctx.lineTo(rulerX - (isC ? unit * 0.025 : unit * 0.012), y);
    ctx.stroke();
    if (isC) {
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillText(midiToNoteName(note), rulerX - unit * 0.035, y);
    }
  }

  // Volume bar on the left edge.
  const barX = unit * 0.03;
  const barW = unit * 0.014;
  const top = levelToHeight(1) * height;
  const bottom = levelToHeight(0) * height;
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.roundRect(barX, top, barW, bottom - top, barW / 2);
  ctx.fill();
  if (volume > 0) {
    const level = Math.sqrt(volume); // back to linear hand height
    const fillTop = bottom - (bottom - top) * level;
    ctx.fillStyle = VOLUME_COLOR;
    ctx.beginPath();
    ctx.roundRect(barX, fillTop, barW, bottom - fillTop, barW / 2);
    ctx.fill();
  }

  // Guide lines from each hand to its scale.
  ctx.setLineDash([6, 8]);
  ctx.lineWidth = 2;
  if (rightHand) {
    ctx.strokeStyle = PITCH_COLOR;
    ctx.beginPath();
    ctx.moveTo(rightHand.x * width, rightHand.y * height);
    ctx.lineTo(rulerX - unit * 0.03, rightHand.y * height);
    ctx.stroke();
  }
  if (leftHand) {
    ctx.strokeStyle = VOLUME_COLOR;
    ctx.beginPath();
    ctx.moveTo(leftHand.x * width, leftHand.y * height);
    ctx.lineTo(barX + barW, leftHand.y * height);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Current note, top centre.
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 12;
  ctx.font = `700 ${Math.round(unit * 0.1)}px ${SANS}`;
  const sounding = volume > 0 && midi !== null;
  ctx.fillStyle = sounding ? "#fff" : "rgba(255,255,255,0.4)";
  ctx.fillText(midi !== null && rightHand ? midiToNoteName(midi) : "–", width / 2, unit * 0.11);
  if (!leftHand || !rightHand) {
    ctx.font = `500 ${Math.round(unit * 0.026)}px ${SANS}`;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText("Show both hands to play", width / 2, unit * 0.19);
  }
  ctx.restore();
}
