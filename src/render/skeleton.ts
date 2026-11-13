import { HAND_CONNECTIONS, type Handedness, type TrackedHand } from "@/core/types";

export interface SkeletonStyle {
  line: string;
  joint: string;
  glow: string;
}

export const HAND_COLORS: Record<Handedness, SkeletonStyle> = {
  Left: { line: "#5eead4", joint: "#f0fdfa", glow: "rgba(45, 212, 191, 0.7)" },
  Right: { line: "#fda4af", joint: "#fff1f2", glow: "rgba(251, 113, 133, 0.7)" },
};

const FINGERTIPS = new Set([4, 8, 12, 16, 20]);

/**
 * Draws one hand skeleton. `width`/`height` are the canvas size in CSS pixels;
 * landmarks are expected in display space (0..1, already mirrored).
 */
export function drawHand(
  ctx: CanvasRenderingContext2D,
  hand: TrackedHand,
  width: number,
  height: number,
  style: SkeletonStyle = HAND_COLORS[hand.handedness],
): void {
  const pts = hand.landmarks;
  if (pts.length < 21) return;

  // Scale strokes with the hand's apparent size so it looks right near and far.
  const palm = Math.hypot(
    (pts[0].x - pts[9].x) * width,
    (pts[0].y - pts[9].y) * height,
  );
  const lineWidth = Math.max(2, Math.min(8, palm * 0.06));

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = style.line;
  ctx.lineWidth = lineWidth;
  ctx.shadowColor = style.glow;
  ctx.shadowBlur = lineWidth * 3;

  ctx.beginPath();
  for (const [a, b] of HAND_CONNECTIONS) {
    ctx.moveTo(pts[a].x * width, pts[a].y * height);
    ctx.lineTo(pts[b].x * width, pts[b].y * height);
  }
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = style.joint;
  for (let i = 0; i < pts.length; i++) {
    const r = FINGERTIPS.has(i) ? lineWidth * 1.1 : lineWidth * 0.7;
    ctx.beginPath();
    ctx.arc(pts[i].x * width, pts[i].y * height, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawHands(
  ctx: CanvasRenderingContext2D,
  hands: readonly TrackedHand[],
  width: number,
  height: number,
): void {
  for (const hand of hands) drawHand(ctx, hand, width, height);
}
