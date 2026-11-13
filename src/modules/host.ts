import type { TrackedHand } from "@/core/types";
import type { GestureFrame } from "@/gestures";
import { getModule } from "./registry";
import type { InstrumentModule, ModuleCanvas, ModuleContext } from "./types";

/**
 * Runs the active module: handles switching (onExit / onEnter) and forwards
 * frames and render calls to it. A module only receives frames once its
 * onEnter has finished.
 */
class ModuleHost {
  private active: InstrumentModule | null = null;
  private ready = false;
  private generation = 0;

  async activate(id: string): Promise<void> {
    if (this.active?.id === id) return;
    this.deactivate();
    const next = getModule(id);
    if (!next) return;

    const generation = ++this.generation;
    this.active = next;
    try {
      await next.onEnter();
    } catch (err) {
      console.error(`[module:${id}] failed to start`, err);
      if (this.generation === generation) this.active = null;
      return;
    }
    if (this.generation !== generation) return; // switched away while loading
    this.ready = true;
  }

  deactivate(): void {
    this.generation++;
    const current = this.active;
    this.active = null;
    this.ready = false;
    try {
      current?.onExit();
    } catch (err) {
      console.error(`[module:${current?.id}] failed to stop`, err);
    }
  }

  frame(
    hands: readonly TrackedHand[],
    gestures: GestureFrame,
    context: ModuleContext,
  ): void {
    if (this.ready) this.active?.onFrame(hands, gestures, context);
  }

  render(canvas: ModuleCanvas): void {
    if (this.ready) this.active?.render(canvas);
  }
}

export const moduleHost = new ModuleHost();
