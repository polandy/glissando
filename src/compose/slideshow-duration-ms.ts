import type { StoredSlideshow } from "../library/stored-slideshow";
import { musicExcerptMs } from "./music-excerpt";
import { slideDurationsMs } from "./slide-durations-ms";

/** How long the slideshow plays in total, e.g. for a "12 pictures · 1:00" summary. */
export function slideshowDurationMs(stored: StoredSlideshow): number {
  const durationsMs = slideDurationsMs(
    stored.pictures,
    musicExcerptMs(stored.music),
    stored.secondsPerPicture,
  );
  return durationsMs.reduce((sum, durationMs) => sum + durationMs, 0);
}
