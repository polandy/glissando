import type { PlaylistEnergy } from "./energy/playlist-energy";
import type { StoredSlideshow } from "../library/stored-slideshow";
import { filledMusicMs } from "./playlist";
import { slideDurationsMs } from "./slide-durations-ms";
import { slideUnits, timedUnit } from "./slide-units";

/**
 * How long the slideshow plays in total, e.g. for a "12 pictures · 1:00" summary. With the
 * playlist's energy (`playlistEnergy`), the total still matches the usual durations' (ADR-0046,
 * "Pacing"), so passing it changes nothing here; absent: the usual durations stand.
 */
export function slideshowDurationMs(stored: StoredSlideshow, energy?: PlaylistEnergy): number {
  const units = slideUnits(stored.pictures, stored.portraitPictures);
  const durationsMs = slideDurationsMs(
    units.map((unit) => timedUnit(stored.pictures, unit)),
    filledMusicMs(stored),
    stored.secondsPerPicture,
    undefined,
    energy,
  );
  return durationsMs.reduce((sum, durationMs) => sum + durationMs, 0);
}
