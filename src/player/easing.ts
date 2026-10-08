import type { Easing } from "./slideshow";

const CUBIC_EASINGS: Readonly<Record<Easing, (progress: number) => number>> = {
  linear: (t) => t,
  "ease-in": (t) => t ** 3,
  "ease-out": (t) => 1 - (1 - t) ** 3,
  "ease-in-out": (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (2 - 2 * t) ** 3 / 2),
};

/** Maps linear progress (clamped to 0..1) through a cubic easing curve. */
export function ease(easing: Easing, progress: number): number {
  return CUBIC_EASINGS[easing](Math.min(1, Math.max(0, progress)));
}
