import type { ModuleCanvas } from "../types";
import { OCTAVES, type ChordsState } from "./controller";
import { chordName, romanNumeral, type KeyName } from "./theory";

export interface ChordsView {
  state: ChordsState;
  key: KeyName;
  /** performance.now() when the last chord sounded (or will sound). */
  lastPlayedAt: number;
  /** 0..1 position inside the current beat. */
  beatPhase: number;
}

const SANS = "ui-sans-serif, system-ui, sans-serif";
const ACCENT = "#fde047";

export function renderChords(canvas: ModuleCanvas, view: ChordsView): void {
  const { ctx, width, height, now } = canvas;
  const { state, key } = view;
  const unit = Math.min(width, height);

  // How "fresh" the last strum is: 1 right when it sounds, fading to 0.
  const since = now - view.lastPlayedAt;
  const flash = since >= 0 && since < 500 ? 1 - since / 500 : 0;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Octave zones on the right side (where the right hand plays).
  const edges = [0.5, 0.667, 0.833, 1];
  const zoneTop = height * 0.2;
  const zoneBottom = height * 0.8;
  for (let i = 0; i < OCTAVES.length; i++) {
    const x0 = edges[i] * width;
    const x1 = edges[i + 1] * width;
    const active = i === state.octaveIndex;
    if (active) {
      ctx.fillStyle = `rgba(253, 224, 71, ${0.07 + flash * 0.12})`;
      ctx.fillRect(x0, zoneTop, x1 - x0, zoneBottom - zoneTop);
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.moveTo(x0, zoneTop);
    ctx.lineTo(x0, zoneBottom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `600 ${Math.round(unit * 0.022)}px ${SANS}`;
    ctx.fillStyle = active ? ACCENT : "rgba(255, 255, 255, 0.55)";
    ctx.fillText(["LOW", "MID", "HIGH"][i], (x0 + x1) / 2, zoneTop - unit * 0.025);
  }

  // Current chord, top centre.
  const nameSize = unit * (0.11 + flash * 0.02);
  const cx = width / 2;
  const cy = unit * 0.11;
  ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
  ctx.shadowBlur = 12;
  ctx.font = `700 ${Math.round(nameSize)}px ${SANS}`;
  ctx.fillStyle = flash > 0 ? ACCENT : "#fff";
  ctx.fillText(chordName(key, state.degree, state.flipped), cx, cy);
  ctx.shadowBlur = 0;

  // Beat dot under the chord name: pulses on every 8th note.
  const eighth = (view.beatPhase * 2) % 1;
  const pulse = Math.max(0, 1 - eighth * 3);
  ctx.beginPath();
  ctx.arc(cx, cy + unit * 0.085, unit * (0.006 + pulse * 0.006), 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 255, 255, ${0.35 + pulse * 0.65})`;
  ctx.fill();

  // The seven degrees along the left side (where the left hand plays).
  const pill = unit * 0.07;
  const gap = unit * 0.012;
  const total = 7 * pill + 6 * gap;
  const px = unit * 0.035;
  let py = (height - total) / 2;
  for (let degree = 1; degree <= 7; degree++) {
    const active = degree === state.degree;
    ctx.beginPath();
    ctx.roundRect(px, py, pill * 1.25, pill, pill * 0.3);
    ctx.fillStyle = active ? ACCENT : "rgba(0, 0, 0, 0.5)";
    ctx.fill();
    ctx.font = `600 ${Math.round(pill * 0.36)}px ${SANS}`;
    ctx.fillStyle = active ? "#000" : "rgba(255, 255, 255, 0.75)";
    ctx.fillText(
      romanNumeral(degree, active && state.flipped),
      px + pill * 0.625,
      py + pill / 2,
    );
    py += pill + gap;
  }
  ctx.restore();
}
