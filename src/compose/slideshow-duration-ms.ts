import type { StoredSlideshow } from "../library/stored-slideshow";
import { filledMusicMs } from "./playlist";
import { slideDurationsMs } from "./slide-durations-ms";
import { slideUnits, timedUnit } from "./slide-units";

/** How long the slideshow plays in total, e.g. for a "12 pictures · 1:00" summary. */
export function slideshowDurationMs(stored: StoredSlideshow): number {
  const units = slideUnits(stored.pictures, stored.portraitPictures);
  const durationsMs = slideDurationsMs(
    units.map((unit) => timedUnit(stored.pictures, unit)),
    filledMusicMs(stored),
    stored.secondsPerPicture,
  );
  return durationsMs.reduce((sum, durationMs) => sum + durationMs, 0);
}
