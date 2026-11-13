import type { TrackedHand } from "@/core/types";
import { FINGER_NAMES, type GestureFrame, type HandGesture } from "@/gestures";
import { HAND_COLORS } from "./skeleton";

/** A strum that should still be shown for a moment after it happened. */
export interface StrumFlash {
  hand: "Left" | "Right";
  direction: "down" | "up";
  strength: number;
  /** performance.now() when it happened. */
  at: number;
}

export const STRUM_FLASH_MS = 350;

const PANEL_W = 150;
const PANEL_H = 92;
const FONT = "11px ui-monospace, SFMono-Regular, Menlo, monospace";

/**
 * Draws what the gesture layer currently detects next to each hand:
 * finger states and count, pinch, fist, tilt, position and velocity.
 */
export function drawDebugOverlay(
  ctx: CanvasRenderingContext2D,
  hands: readonly TrackedHand[],
  gestures: GestureFrame,
  flashes: readonly StrumFlash[],
  now: number,
  width: number,
  height: number,
): void {
  for (const gesture of [gestures.left, gestures.right]) {
    if (!gesture) continue;
    const hand = hands.find((h) => h.handedness === gesture.handedness);
    if (!hand) continue;
    drawPanel(ctx, hand, gesture, width, height);
  }
  for (const flash of flashes) {
    const g = flash.hand === "Left" ? gestures.left : gestures.right;
    if (g) drawStrum(ctx, g, flash, now, width, height);
  }
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  hand: TrackedHand,
  g: HandGesture,
  width: number,
  height: number,
): void {
  const color = HAND_COLORS[g.handedness].line;
  const wrist = hand.landmarks[0];
  // Below the wrist, kept inside the canvas.
  const x = clamp(wrist.x * width - PANEL_W / 2, 6, width - PANEL_W - 6);
  const y = clamp(wrist.y * height + 16, 6, height - PANEL_H - 6);

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
  ctx.beginPath();
  ctx.roundRect(x, y, PANEL_W, PANEL_H, 8);
  ctx.fill();

  ctx.font = `600 ${FONT}`;
  ctx.textBaseline = "top";
  ctx.fillStyle = color;
  ctx.fillText(g.handedness.toUpperCase(), x + 10, y + 9);

  // Five dots: thumb to pinky, filled when extended.
  FINGER_NAMES.forEach((finger, i) => {
    ctx.beginPath();
    ctx.arc(x + 62 + i * 13, y + 15, 4.5, 0, Math.PI * 2);
    if (g.fingers[finger]) {
      ctx.fillStyle = color;
      ctx.fill();
    } else {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  });
  ctx.fillStyle = "#fff";
  ctx.fillText(String(g.fingerCount), x + PANEL_W - 18, y + 9);

  ctx.font = FONT;
  const deg = Math.round((g.tilt * 180) / Math.PI);
  const lines: [string, boolean][] = [
    [`pinch ${g.pinch ? "ON " : "off"}  fist ${g.fist ? "ON" : "off"}`, g.pinch || g.fist],
    [`tilt ${deg > 0 ? "+" : ""}${deg}°`, false],
    [`x ${g.x.toFixed(2)}  y ${g.y.toFixed(2)}`, false],
    [`vx ${signed(g.vx)} vy ${signed(g.vy)}`, false],
  ];
  lines.forEach(([text, active], i) => {
    ctx.fillStyle = active ? "#fde047" : "rgba(255, 255, 255, 0.8)";
    ctx.fillText(text, x + 10, y + 28 + i * 15);
  });
  ctx.restore();
}

function drawStrum(
  ctx: CanvasRenderingContext2D,
  g: HandGesture,
  flash: StrumFlash,
  now: number,
  width: number,
  height: number,
): void {
  const age = (now - flash.at) / STRUM_FLASH_MS;
  if (age < 0 || age > 1) return;
  const dir = flash.direction === "down" ? 1 : -1;
  const x = g.x * width;
  const y = g.y * height;
  const length = 40 + flash.strength * 60;

  ctx.save();
  ctx.globalAlpha = 1 - age;
  ctx.strokeStyle = "#fde047";
  ctx.fillStyle = "#fde047";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y - (dir * length) / 2);
  ctx.lineTo(x, y + (dir * length) / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y + dir * (length / 2 + 14));
  ctx.lineTo(x - 11, y + (dir * length) / 2 - dir * 2);
  ctx.lineTo(x + 11, y + (dir * length) / 2 - dir * 2);
  ctx.closePath();
  ctx.fill();
  ctx.font = `600 ${FONT}`;
  ctx.textBaseline = "middle";
  ctx.fillText("STRUM", x + 18, y);
  ctx.restore();
}

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

const signed = (v: number) => `${v >= 0 ? "+" : "-"}${Math.abs(v).toFixed(1)}`;
