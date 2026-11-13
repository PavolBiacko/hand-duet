import type { TrackedHand } from "../core/types.ts";
import type { GestureFrame } from "../gestures/types.ts";

/** Extra information passed to a module with every frame. */
export interface ModuleContext {
  /** Frame time in ms (performance.now() clock). */
  timestamp: number;
  /** Video width / height. */
  aspect: number;
}

/** What a module draws on. Sizes are in CSS pixels. */
export interface ModuleCanvas {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  /** performance.now() of this animation frame. */
  now: number;
}

/**
 * One instrument / experience. To add a module, implement this interface and
 * add it to the array in `registry.ts`.
 */
export interface InstrumentModule {
  /** Stable identifier (used in settings and URLs). */
  id: string;
  /** Name shown in the module switcher. */
  name: string;
  /** Emoji shown next to the name. */
  icon: string;
  /** Called when the module becomes active. Set up audio here. */
  onEnter(): void | Promise<void>;
  /**
   * Called for every tracking result while active, including frames with no
   * hands (so the module can go silent when tracking is lost).
   */
  onFrame(
    hands: readonly TrackedHand[],
    gestures: GestureFrame,
    context: ModuleContext,
  ): void;
  /** Called every animation frame to draw the module's visuals. */
  render(canvas: ModuleCanvas): void;
  /** Called when the module is switched away from. Stop all sound here. */
  onExit(): void;
}
