import type { PlaylistEnergy } from "./energy/playlist-energy";
import type { StoredSlideshow } from "../library/stored-slideshow";
import { picturesFillMs, targetSecondsPerPicture } from "./filled-length";
import { playlistMs } from "./playlist";
import { slideDurationsMs } from "./slide-durations-ms";
import { slideUnits, timedUnit } from "./slide-units";

/**
 * How long the slideshow plays in total, e.g. for a "12 pictures · 1:00" summary. With the
 * playlist's energy (`playlistEnergy`), the total still matches the usual durations' (ADR-0046,
 * "Pacing"), so passing it changes nothing here; absent: the usual durations stand.
 */
export function slideshowDurationMs(stored: StoredSlideshow, energy?: PlaylistEnergy): number {
  const units = slideUnits(stored.pictures, stored.portraitPictures);
  const timedPictures = units.map((unit) => timedUnit(stored.pictures, unit));
  const target = targetSecondsPerPicture(stored.pictureLength, stored.secondsPerPicture);
  const filledMs = picturesFillMs(playlistMs(stored), timedPictures, target, stored.repeatMusic);
  const durationsMs = slideDurationsMs(
    timedPictures,
    filledMs,
    target ?? stored.secondsPerPicture,
    undefined,
    energy,
  );
  return durationsMs.reduce((sum, durationMs) => sum + durationMs, 0);
}
