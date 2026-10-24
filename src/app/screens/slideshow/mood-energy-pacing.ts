import { playlistEnergy } from "../../../compose/energy/playlist-energy";
import { moodSettings, moodTempo } from "../../../compose/mood-settings";
import { filledMusicMs, playlistBeatsMs, type SongBeats } from "../../../compose/playlist";
import { slideDurationsMs } from "../../../compose/slide-durations-ms";
import { slideUnits, timedUnit } from "../../../compose/slide-units";
import type { SongLoudness } from "../../../compose/song-loudness";
import type { SlideshowMood } from "../../../library/slideshow-mood";
import type { StoredSlideshow } from "../../../library/stored-slideshow";

/** The Mood sheet's "What it sets" row and energy strip, once "Follow the music's energy" is on. */
export interface MoodEnergyPacing {
  /** The shortest automatic slide duration, paced by the music's energy. */
  readonly minMs: number;
  /** The longest automatic slide duration, paced by the music's energy. */
  readonly maxMs: number;
  /** The slide unit right after the first lift, in play order; absent without one. */
  readonly firstLiftUnitIndex: number | undefined;
}

/**
 * Composes the slideshow's slide durations under `shownMood`, the same way `composeSlideshow`
 * does with the energy pacing on (ADR-0046), and reads off the range the durations span and where
 * the first lift falls. Pure: `stored` is read, never changed.
 */
export function moodEnergyPacing(
  stored: StoredSlideshow,
  shownMood: SlideshowMood | undefined,
  beats: SongBeats,
  loudness: SongLoudness,
): MoodEnergyPacing {
  const units = slideUnits(stored.pictures, stored.portraitPictures);
  const mood =
    shownMood === undefined ? undefined : moodSettings(shownMood, moodTempo(stored, beats));
  const beatsMs = playlistBeatsMs(stored, beats);
  const energy = playlistEnergy(stored, loudness, beats);
  const durationsMs = slideDurationsMs(
    units.map((unit) => timedUnit(stored.pictures, unit)),
    mood === undefined ? filledMusicMs(stored) : undefined,
    mood?.secondsPerPicture ?? stored.secondsPerPicture,
    beatsMs,
    energy,
  );
  const firstLiftMs = energy.liftsMs[0];
  return {
    minMs: Math.min(...durationsMs),
    maxMs: Math.max(...durationsMs),
    firstLiftUnitIndex: firstLiftMs === undefined ? undefined : unitIndexAfter(durationsMs, firstLiftMs),
  };
}

/** The index right after the boundary at or past `atMs`, cumulating `durationsMs` in play order. */
function unitIndexAfter(durationsMs: readonly number[], atMs: number): number {
  let cumulativeMs = 0;
  for (const [index, durationMs] of durationsMs.entries()) {
    cumulativeMs += durationMs;
    if (cumulativeMs >= atMs) {
      return index + 1;
    }
  }
  return durationsMs.length;
}
