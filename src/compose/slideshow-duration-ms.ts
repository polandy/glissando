import type { PlaylistEnergy } from "./energy/playlist-energy";
import type { StoredSlideshow } from "../library/stored-slideshow";
import { picturesFillMs } from "./filled-length";
import { slideshowTargetSecondsPerPicture } from "./mood-settings";
import { NO_SONG_BEATS, playlistMs, type SongBeats } from "./playlist";
import { slideDurationsMs } from "./slide-durations-ms";
import { slideUnits, timedUnit } from "./slide-units";

/**
 * How long the slideshow plays in total, e.g. for a "12 pictures · 1:00" summary. With the
 * playlist's energy (`playlistEnergy`), the total still matches the usual durations' (ADR-0046,
 * "Pacing"), so passing it changes nothing here; absent: the usual durations stand. This is
 * display-only — it does not drive a video or HTML export's real duration, which composes with
 * the beats found by the time the export runs. `beats` defaults to none, so an estimate shown
 * before a beats pass has found any still paces a mood by its target seconds alone, same as
 * `composeSlideshow` would without a tempo either (`slideshowTargetSecondsPerPicture`).
 */
export function slideshowDurationMs(
  stored: StoredSlideshow,
  beats: SongBeats = NO_SONG_BEATS,
  energy?: PlaylistEnergy,
): number {
  const units = slideUnits(stored.pictures, stored.portraitPictures);
  const timedPictures = units.map((unit) => timedUnit(stored.pictures, unit));
  const target = slideshowTargetSecondsPerPicture(stored, beats);
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
