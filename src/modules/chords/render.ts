import type { ModuleCanvas } from "../types";
import { OCTAVES, type ChordsState } from "./controller";
import { chordName, romanNumeral, type KeyName } from "./theory";

export interface ChordsView {
  state: ChordsState;
  key: KeyName;
}

const SANS = "ui-sans-serif, system-ui, sans-serif";
const ACCENT = "#fde047";

export function renderChords(canvas: ModuleCanvas, view: ChordsView): void {
  const { ctx, width, height } = canvas;
  const { state, key } = view;
  const unit = Math.min(width, height);
  const sounding = state.active;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Octave zones on the right side (optional: move the right hand sideways).
  const edges = [0.5, 0.667, 0.833, 1];
  const zoneTop = height * 0.24;
  const zoneBottom = height * 0.8;
  for (let i = 0; i < OCTAVES.length; i++) {
    const x0 = edges[i] * width;
    const x1 = edges[i + 1] * width;
    const active = i === state.octaveIndex;
    if (active) {
      ctx.fillStyle = `rgba(253, 224, 71, ${sounding ? 0.14 : 0.05})`;
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

  // Current chord, top centre. Lit while it sounds (left hand on screen).
  const cx = width / 2;
  const cy = unit * 0.1;
  ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
  ctx.shadowBlur = 12;
  ctx.font = `700 ${Math.round(unit * 0.11)}px ${SANS}`;
  ctx.fillStyle = sounding ? ACCENT : "rgba(255, 255, 255, 0.45)";
  ctx.fillText(chordName(key, state.degree, state.flipped), cx, cy);
  if (!sounding) {
    ctx.font = `500 ${Math.round(unit * 0.024)}px ${SANS}`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fillText("Show your left hand to play", cx, cy + unit * 0.085);
  }
  ctx.shadowBlur = 0;

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
    ctx.fillStyle = active
      ? sounding
        ? ACCENT
        : "rgba(255, 255, 255, 0.75)"
      : "rgba(0, 0, 0, 0.5)";
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
