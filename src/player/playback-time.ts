import type { Clock } from "./ports";

/**
 * The slideshow time of a player: held while paused, advancing with the clock while playing.
 * The frame time is that of the frame on screen; the live time runs ahead of it between frames.
 */
export class PlaybackTime {
  readonly #clock: Clock;
  readonly durationMs: number;
  #frameMs = 0;
  /** Where the clock and the slideshow time met; set only while time advances. */
  #anchor: { readonly timeMs: number; readonly clockMs: number } | null = null;

  constructor(clock: Clock, durationMs: number) {
    this.#clock = clock;
    this.durationMs = durationMs;
  }

  get frameMs(): number {
    return this.#frameMs;
  }

  get isAtEnd(): boolean {
    return this.#frameMs >= this.durationMs;
  }

  /** The time now, never past the end. */
  liveMs(): number {
    if (this.#anchor === null) {
      return this.#frameMs;
    }
    const elapsedMs = this.#clock.now() - this.#anchor.clockMs;
    return Math.min(this.durationMs, this.#anchor.timeMs + elapsedMs);
  }

  /** Moves the frame time to `ms`, clamped to the slideshow; only while held. */
  holdAt(ms: number): void {
    this.#frameMs = Math.min(this.durationMs, Math.max(0, ms));
  }

  /** Starts advancing from the frame time, as of the clock's now. */
  startAdvancing(): void {
    this.#anchor = { timeMs: this.#frameMs, clockMs: this.#clock.now() };
  }

  /** Moves the frame time up to the live time, for the next frame; returns it. */
  catchUp(): number {
    this.#frameMs = this.liveMs();
    return this.#frameMs;
  }

  /** Holds at the live time; true if the time was advancing. */
  stopAdvancing(): boolean {
    if (this.#anchor === null) {
      return false;
    }
    this.catchUp();
    this.#anchor = null;
    return true;
  }
}
