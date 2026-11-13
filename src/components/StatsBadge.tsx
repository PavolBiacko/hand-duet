"use client";

import { useAppStore } from "@/store/app";

/** Small tracking readout: FPS, model time, delegate and hand count. */
export default function StatsBadge() {
  const fps = useAppStore((s) => s.fps);
  const inferenceMs = useAppStore((s) => s.inferenceMs);
  const delegate = useAppStore((s) => s.delegate);
  const handCount = useAppStore((s) => s.handCount);

  return (
    <div
      data-testid="stats"
      className="absolute left-3 top-3 flex items-center gap-3 rounded-full bg-black/55 px-3 py-1.5 font-mono text-xs text-white/90 backdrop-blur"
    >
      <span>
        <span data-testid="fps">{fps}</span> fps
      </span>
      <span className="text-white/60">{inferenceMs} ms</span>
      {delegate && <span className="text-white/60">{delegate}</span>}
      <span className="flex items-center gap-1.5">
        <span
          className={`h-2 w-2 rounded-full ${handCount > 0 ? "bg-emerald-400" : "bg-white/30"}`}
        />
        <span data-testid="hand-count">{handCount}</span>
        {handCount === 1 ? " hand" : " hands"}
      </span>
    </div>
  );
}
