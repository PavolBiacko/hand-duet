import type { ModuleCanvas } from "../types";
import { DEGREE_SHAPES, OCTAVES, type ChordsState } from "./controller";
import { chordName, romanNumeral, type KeyName, type ScaleName } from "./theory";

export interface ChordsView {
  state: ChordsState;
  key: KeyName;
  scale: ScaleName;
}

const SANS = "ui-sans-serif, system-ui, sans-serif";
const ACCENT = "#fde047";
const LEFT_COLOR = "#5eead4";
const RIGHT_COLOR = "#fda4af";

export function renderChords(canvas: ModuleCanvas, view: ChordsView): void {
  const { ctx, width, height } = canvas;
  const { state, key, scale } = view;
  const unit = Math.min(width, height);
  const sounding = state.active;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0, 0, 0, 0.75)";

  // --- Right hand: octave zones -------------------------------------------
  const edges = [0.5, 0.667, 0.833, 1];
  const zoneTop = height * 0.3;
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
    ctx.shadowBlur = 6;
    ctx.font = `600 ${Math.round(unit * 0.02)}px ${SANS}`;
    ctx.fillStyle = active ? ACCENT : "rgba(255, 255, 255, 0.6)";
    ctx.fillText(["LOW", "MID", "HIGH"][i], (x0 + x1) / 2, zoneTop + unit * 0.025);
    ctx.shadowBlur = 0;
  }
  drawInstruction(
    ctx,
    width * 0.75,
    zoneTop - unit * 0.05,
    unit,
    "RIGHT HAND",
    sounding ? "playing · move sideways for octave" : "show it to play",
    RIGHT_COLOR,
  );

  // --- Current chord, top centre ------------------------------------------
  const cx = width / 2;
  const cy = unit * 0.1;
  ctx.shadowBlur = 12;
  ctx.font = `700 ${Math.round(unit * 0.11)}px ${SANS}`;
  ctx.fillStyle = sounding ? ACCENT : "rgba(255, 255, 255, 0.45)";
  ctx.fillText(chordName(key, scale, state.degree, state.flipped), cx, cy);
  ctx.shadowBlur = 0;

  // --- Left hand: which shape gives which chord ---------------------------
  const rowH = unit * 0.068;
  const rowW = unit * 0.35;
  const gap = unit * 0.01;
  const total = 7 * rowH + 6 * gap;
  const px = unit * 0.03;
  const top = Math.max(unit * 0.2, (height - total) / 2 + unit * 0.02);

  ctx.textAlign = "left";
  drawInstruction(ctx, px, top - unit * 0.05, unit, "LEFT HAND", "shape picks the chord", LEFT_COLOR, "left");

  let py = top;
  for (let degree = 1; degree <= 7; degree++) {
    const shape = DEGREE_SHAPES[degree - 1];
    const active = degree === state.degree;
    const fg = active ? "#000" : "#fff";
    const dim = active ? "rgba(0, 0, 0, 0.28)" : "rgba(255, 255, 255, 0.28)";

    ctx.beginPath();
    ctx.roundRect(px, py, rowW, rowH, rowH * 0.3);
    ctx.fillStyle = active
      ? sounding
        ? ACCENT
        : "rgba(255, 255, 255, 0.85)"
      : "rgba(0, 0, 0, 0.55)";
    ctx.fill();

    drawHandGlyph(ctx, px + rowH * 0.12, py + rowH * 0.1, rowH * 0.8, shape.fingers, fg, dim);

    // Chord name, then how to make it.
    ctx.textAlign = "left";
    ctx.font = `700 ${Math.round(rowH * 0.42)}px ${SANS}`;
    ctx.fillStyle = fg;
    const name = chordName(key, scale, degree, active && state.flipped);
    ctx.fillText(name, px + rowH * 1.2, py + rowH * 0.5);
    ctx.font = `500 ${Math.round(rowH * 0.27)}px ${SANS}`;
    ctx.fillStyle = active ? "rgba(0, 0, 0, 0.7)" : "rgba(255, 255, 255, 0.7)";
    ctx.fillText(shape.label, px + rowH * 2.25, py + rowH * 0.5);

    ctx.textAlign = "right";
    ctx.font = `600 ${Math.round(rowH * 0.27)}px ${SANS}`;
    ctx.fillText(
      romanNumeral(scale, degree, active && state.flipped),
      px + rowW - rowH * 0.2,
      py + rowH * 0.5,
    );
    py += rowH + gap;
  }

  ctx.textAlign = "left";
  ctx.shadowBlur = 6;
  ctx.font = `500 ${Math.round(unit * 0.019)}px ${SANS}`;
  ctx.fillStyle = state.flipped ? ACCENT : "rgba(255, 255, 255, 0.8)";
  ctx.fillText("tilt the hand sideways: major ↔ minor", px, py + unit * 0.015);
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.fillText("fist: keep the chord", px, py + unit * 0.042);
  ctx.restore();
}

/** Two-line label: a coloured heading and a short explanation. */
function drawInstruction(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  unit: number,
  heading: string,
  text: string,
  color: string,
  align: CanvasTextAlign = "center",
): void {
  ctx.save();
  ctx.textAlign = align;
  ctx.shadowBlur = 6;
  ctx.font = `700 ${Math.round(unit * 0.02)}px ${SANS}`;
  ctx.fillStyle = color;
  ctx.fillText(heading, x, y);
  ctx.font = `500 ${Math.round(unit * 0.019)}px ${SANS}`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.fillText(text, x, y + unit * 0.026);
  ctx.restore();
}

/**
 * Small picture of a left hand as the player sees it on screen (palm towards
 * the camera, thumb on the right). Raised fingers are drawn long and solid,
 * folded ones as short faint stubs.
 */
function drawHandGlyph(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  fingers: readonly [boolean, boolean, boolean, boolean, boolean],
  color: string,
  dim: string,
): void {
  const [thumb, index, middle, ring, pinky] = fingers;
  const stroke = size * 0.12;
  const palmX = x + size * 0.12;
  const palmW = size * 0.56;
  const palmTop = y + size * 0.55;
  const palmH = size * 0.4;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineWidth = stroke;

  // Fingers left to right on screen: pinky, ring, middle, index.
  const raised = [pinky, ring, middle, index];
  const lengths = [0.34, 0.44, 0.5, 0.44];
  raised.forEach((up, i) => {
    const fx = palmX + stroke / 2 + (i * (palmW - stroke)) / 3;
    ctx.strokeStyle = up ? color : dim;
    ctx.beginPath();
    ctx.moveTo(fx, palmTop);
    ctx.lineTo(fx, palmTop - size * (up ? lengths[i] : 0.08));
    ctx.stroke();
  });

  // Thumb sticks out to the right.
  ctx.strokeStyle = thumb ? color : dim;
  ctx.beginPath();
  ctx.moveTo(palmX + palmW, palmTop + palmH * 0.45);
  ctx.lineTo(
    palmX + palmW + size * (thumb ? 0.3 : 0.08),
    palmTop + palmH * 0.45 - size * (thumb ? 0.22 : 0.05),
  );
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(palmX, palmTop, palmW, palmH, size * 0.1);
  ctx.fill();
  ctx.restore();
}
