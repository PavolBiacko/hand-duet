"use client";

import { useEffect, useRef } from "react";
import {
  drawDebugOverlay,
  STRUM_FLASH_MS,
  type StrumFlash,
} from "@/render/debugOverlay";
import { moduleHost } from "@/modules/host";
import { drawHands } from "@/render/skeleton";
import { useAppStore } from "@/store/app";
import { useHandsStore } from "@/store/hands";

/** Transparent canvas on top of the video that draws the tracked hands. */
export default function HandCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let width = 0;
    let height = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    // Strums are one-frame events; remember them briefly so they can be drawn.
    let flashes: StrumFlash[] = [];
    const unsubscribe = useHandsStore.subscribe((state, previous) => {
      if (state.gestures === previous.gestures) return;
      for (const event of state.gestures.events) {
        if (event.type !== "strum") continue;
        flashes.push({
          hand: event.hand,
          direction: event.direction,
          strength: event.strength,
          at: performance.now(),
        });
      }
    });

    let raf = 0;
    const frame = () => {
      const now = performance.now();
      const { hands, gestures } = useHandsStore.getState();
      ctx.clearRect(0, 0, width, height);
      moduleHost.render({ ctx, width, height, now });
      drawHands(ctx, hands, width, height);
      if (useAppStore.getState().debug) {
        flashes = flashes.filter((f) => now - f.at < STRUM_FLASH_MS);
        drawDebugOverlay(ctx, hands, gestures, flashes, now, width, height);
      } else {
        flashes = [];
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      unsubscribe();
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
