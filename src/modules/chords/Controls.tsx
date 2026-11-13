"use client";

import { useSettingsStore } from "@/store/settings";
import { KEYS, SCALES, type KeyName, type ScaleName } from "./theory";

const SELECT =
  "rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur outline-none hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-yellow-300";

/** Key and scale pickers for the Chords module. */
export default function ChordsControls() {
  const chordKey = useSettingsStore((s) => s.chordKey);
  const chordScale = useSettingsStore((s) => s.chordScale);
  const setChordKey = useSettingsStore((s) => s.setChordKey);
  const setChordScale = useSettingsStore((s) => s.setChordScale);

  return (
    <div className="flex items-center gap-1.5">
      <select
        aria-label="Key"
        title="Key"
        value={chordKey}
        onChange={(e) => setChordKey(e.target.value as KeyName)}
        className={SELECT}
      >
        {KEYS.map((key) => (
          <option key={key} value={key} className="bg-zinc-900">
            {key}
          </option>
        ))}
      </select>
      <select
        aria-label="Scale"
        title="Scale"
        value={chordScale}
        onChange={(e) => setChordScale(e.target.value as ScaleName)}
        className={SELECT}
      >
        {SCALES.map((scale) => (
          <option key={scale} value={scale} className="bg-zinc-900">
            {scale}
          </option>
        ))}
      </select>
    </div>
  );
}
