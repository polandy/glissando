/**
 * Reserve on the shortfall between preparing and showing the pictures, for a Wi-Fi whose speed
 * varies while the slideshow plays (ADR-0027).
 */
const PRELOAD_SAFETY_FACTOR = 1.2;

/** How long to prepare before playing so that preparing never falls behind the slides. */
export interface PreloadPlan {
  readonly startDelaySeconds: number;
  /** The pictures ready, in order, once that delay has passed. */
  readonly preloadCount: number;
}

/**
 * The plan for pictures prepared one after another, `secondsPerPicture` each, shown as slides
 * starting at `slideStarts` seconds: picture i is ready after (i + 1) · t, needed at delay + its
 * start, so the delay covers the largest shortfall i · t − start, padded by the safety factor.
 * For even slides this is t + (N − 1) · max(0, t − slide) · 1.2. Playing from slide
 * `fromSlide`, the slides before it are left out and the rest count from its start.
 */
export function planPreload(
  secondsPerPicture: number,
  allSlideStarts: readonly number[],
  fromSlide = 0,
): PreloadPlan {
  const origin = allSlideStarts[fromSlide] ?? 0;
  const slideStarts = allSlideStarts.slice(fromSlide).map((start) => start - origin);
  if (secondsPerPicture <= 0) {
    return { startDelaySeconds: 0, preloadCount: Math.min(slideStarts.length, 1) };
  }
  const shortfall = Math.max(
    0,
    ...slideStarts.map((start, index) => index * secondsPerPicture - start),
  );
  const startDelaySeconds = secondsPerPicture + shortfall * PRELOAD_SAFETY_FACTOR;
  const preloadCount = Math.min(
    slideStarts.length,
    Math.max(1, Math.ceil(startDelaySeconds / secondsPerPicture)),
  );
  return { startDelaySeconds, preloadCount };
}
