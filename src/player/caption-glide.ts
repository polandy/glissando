/** How long a caption takes to glide to a new inset, as the controls' own fade. */
export const CAPTION_GLIDE_MS = 280;

/** CSS `ease`, i.e. `cubic-bezier(0.25, 0.1, 0.25, 1)`. */
const EASE_X1 = 0.25;
const EASE_Y1 = 0.1;
const EASE_X2 = 0.25;
const EASE_Y2 = 1;
/** Bisection halves the error each step; 2⁻³⁰ is far below a CSS pixel. */
const BISECTION_STEPS = 30;

function bezier(p1: number, p2: number, t: number): number {
  const u = 1 - t;
  return 3 * p1 * t * u * u + 3 * p2 * t * t * u + t * t * t;
}

/** Maps linear progress (clamped to 0..1) through CSS `ease`. */
export function cssEase(progress: number): number {
  if (progress <= 0) {
    return 0;
  }
  if (progress >= 1) {
    return 1;
  }
  let low = 0;
  let high = 1;
  for (let step = 0; step < BISECTION_STEPS; step += 1) {
    const middle = (low + high) / 2;
    if (bezier(EASE_X1, EASE_X2, middle) < progress) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return bezier(EASE_Y1, EASE_Y2, (low + high) / 2);
}

/**
 * The caption inset over time: it glides from where it is to each new target, so captions move
 * with the controls instead of jumping. Pure; the caller passes the time.
 */
export class CaptionGlide {
  #from = 0;
  #target = 0;
  #startMs = 0;
  #durationMs = 0;

  get target(): number {
    return this.#target;
  }

  glideTo(target: number, nowMs: number): void {
    if (target === this.#target) {
      return;
    }
    this.#from = this.valueAt(nowMs);
    this.#target = target;
    this.#startMs = nowMs;
    this.#durationMs = CAPTION_GLIDE_MS;
  }

  jumpTo(target: number): void {
    this.#from = target;
    this.#target = target;
    this.#durationMs = 0;
  }

  valueAt(nowMs: number): number {
    if (!this.isGlidingAt(nowMs)) {
      return this.#target;
    }
    const progress = cssEase((nowMs - this.#startMs) / this.#durationMs);
    return this.#from + (this.#target - this.#from) * progress;
  }

  isGlidingAt(nowMs: number): boolean {
    return nowMs < this.#startMs + this.#durationMs;
  }
}
