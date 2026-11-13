/**
 * Two-threshold switch: turns on above `on`, off below `off`, and keeps its
 * previous state in between. Stops a value hovering near one threshold from
 * flickering.
 */
export function schmitt(
  previous: boolean,
  value: number,
  on: number,
  off: number,
): boolean {
  if (value >= on) return true;
  if (value <= off) return false;
  return previous;
}

/**
 * Only accepts a new value after it has been held for `holdMs`. Used for the
 * finger count, so going from 1 to 3 fingers does not briefly report 2.
 */
export class Debounced<T> {
  private readonly holdMs: number;
  private current: T | undefined;
  private candidate: T | undefined;
  private candidateSince = 0;

  constructor(holdMs: number) {
    this.holdMs = holdMs;
  }

  update(value: T, now: number): T {
    if (this.current === undefined || value === this.current) {
      this.current = value;
      this.candidate = undefined;
      return value;
    }
    if (value !== this.candidate) {
      this.candidate = value;
      this.candidateSince = now;
    } else if (now - this.candidateSince >= this.holdMs) {
      this.current = value;
      this.candidate = undefined;
    }
    return this.current;
  }
}
