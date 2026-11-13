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
 * The plan for pictures prepared `concurrency` at a time in rounds of `secondsPerPicture` each,
 * shown as slides starting at `slideStarts` seconds: picture i is ready after (⌊i / c⌋ + 1) · t,
 * needed at delay + its start, so the delay covers the largest shortfall ⌊i / c⌋ · t − start,
 * padded by the safety factor; the pictures to prepare first are whole rounds. One at a time
 * and even slides this is t + (N − 1) · max(0, t − slide) · 1.2 (ADR-0027, ADR-0058). Playing
 * from slide `fromSlide`, the slides before it are left out and the rest count from its start.
 */
export function planPreload(
  secondsPerPicture: number,
  allSlideStarts: readonly number[],
  fromSlide = 0,
  concurrency = 1,
): PreloadPlan {
  const origin = allSlideStarts[fromSlide] ?? 0;
  const slideStarts = allSlideStarts.slice(fromSlide).map((start) => start - origin);
  if (secondsPerPicture <= 0) {
    return { startDelaySeconds: 0, preloadCount: Math.min(slideStarts.length, 1) };
  }
  const shortfall = Math.max(
    0,
    ...slideStarts.map(
      (start, index) => Math.floor(index / concurrency) * secondsPerPicture - start,
    ),
  );
  const startDelaySeconds = secondsPerPicture + shortfall * PRELOAD_SAFETY_FACTOR;
  const rounds = Math.max(1, Math.ceil(startDelaySeconds / secondsPerPicture));
  const preloadCount = Math.min(slideStarts.length, rounds * concurrency);
  return { startDelaySeconds, preloadCount };
}
