/** Smoothed frames-per-second meter (exponential moving average). */
export class FpsMeter {
  private last = 0;
  private avgInterval = 0;

  constructor(private readonly smoothing = 0.9) {}

  /** Call once per frame. Returns the current smoothed FPS. */
  tick(now: number): number {
    if (this.last > 0) {
      const interval = now - this.last;
      // Ignore long pauses (tab hidden, camera stalled) instead of averaging them in.
      if (interval < 1000) {
        this.avgInterval =
          this.avgInterval === 0
            ? interval
            : this.avgInterval * this.smoothing + interval * (1 - this.smoothing);
      }
    }
    this.last = now;
    return this.fps;
  }

  get fps(): number {
    return this.avgInterval > 0 ? 1000 / this.avgInterval : 0;
  }

  reset(): void {
    this.last = 0;
    this.avgInterval = 0;
  }
}
