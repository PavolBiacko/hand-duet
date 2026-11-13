import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  isKeyName,
  isScaleName,
  type KeyName,
  type ScaleName,
} from "@/modules/chords/theory";

interface Settings {
  /** Key the Chords module plays in. */
  chordKey: KeyName;
  /** Scale the Chords module plays in. */
  chordScale: ScaleName;
}

interface SettingsState extends Settings {
  setChordKey: (key: KeyName) => void;
  setChordScale: (scale: ScaleName) => void;
}

const DEFAULTS: Settings = { chordKey: "C", chordScale: "major" };

/** User settings, remembered in localStorage between visits. */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setChordKey: (chordKey) => set({ chordKey }),
      setChordScale: (chordScale) => set({ chordScale }),
    }),
    {
      name: "hand-duet-settings",
      version: 1,
      partialize: ({ chordKey, chordScale }) => ({ chordKey, chordScale }),
      // Never trust what is in storage: fall back to defaults for bad values.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<Settings>;
        return {
          ...current,
          chordKey: isKeyName(saved.chordKey) ? saved.chordKey : DEFAULTS.chordKey,
          chordScale: isScaleName(saved.chordScale) ? saved.chordScale : DEFAULTS.chordScale,
        };
      },
    },
  ),
);
