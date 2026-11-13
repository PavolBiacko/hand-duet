"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/app";

/** Button (and the "D" key) that shows or hides the gesture debug overlay. */
export default function DebugToggle() {
  const debug = useAppStore((s) => s.debug);
  const setDebug = useAppStore((s) => s.setDebug);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (event.key.toLowerCase() === "d") {
        setDebug(!useAppStore.getState().debug);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setDebug]);

  return (
    <button
      type="button"
      aria-pressed={debug}
      onClick={() => setDebug(!debug)}
      title="Show what the gesture layer detects (D)"
      className={`absolute right-3 top-3 rounded-full px-3 py-1.5 font-mono text-xs backdrop-blur transition ${
        debug
          ? "bg-yellow-300 text-black"
          : "bg-black/55 text-white/80 hover:bg-black/75"
      }`}
    >
      Debug
    </button>
  );
}
