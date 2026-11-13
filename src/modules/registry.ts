import { chordsModule } from "./chords";
import type { InstrumentModule } from "./types";

/** All available modules, in the order they appear in the switcher. */
export const modules: InstrumentModule[] = [
  chordsModule,
];

export const DEFAULT_MODULE_ID = modules[0].id;

export function getModule(id: string): InstrumentModule | undefined {
  return modules.find((m) => m.id === id);
}
