import { playlistEnergy } from "../../../compose/energy/playlist-energy";
import { picturesFillMs, targetSecondsPerPicture } from "../../../compose/filled-length";
import { moodSettings, moodTempo } from "../../../compose/mood-settings";
import { playlistBeatsMs, playlistMs, type SongBeats } from "../../../compose/playlist";
import { slideDurationsMs } from "../../../compose/slide-durations-ms";
import { slideUnits, timedUnit } from "../../../compose/slide-units";
import type { SongLoudness } from "../../../compose/song-loudness";
import type { SlideshowMood } from "../../../library/slideshow-mood";
import type { StoredSlideshow } from "../../../library/stored-slideshow";
import { PREVIEW_PICTURE_COUNT, previewWindowStartIndex } from "./preview-window";

/** The Mood sheet's "What it sets" row and energy strip, once "Follow the music's energy" is on. */
export interface MoodEnergyPacing {
  /** The shortest automatic slide duration, paced by the music's energy. */
  readonly minMs: number;
  /** The longest automatic slide duration, paced by the music's energy. */
  readonly maxMs: number;
  /** The slide unit right after the first lift, in play order; absent without one. */
  readonly firstLiftUnitIndex: number | undefined;
}

/** `EnergyStrip.svelte`'s data (ADR-0046): the whole slideshow's curve and ticks, in ms. */
export interface MoodEnergyStripData {
  /** The whole slideshow's automatic length, under the energy pacing. */
  readonly totalMs: number;
  /** The energy curve, sampled wherever the strip likes. */
  readonly energyAt: (ms: number) => number;
  /** Every picture change, as a position in ms, excluding the very end. */
  readonly tickMs: readonly number[];
  /** Every lift found, as a position in ms. */
  readonly liftsMs: readonly number[];
  /** The ms stretch the Mood sheet's preview plays, shaded on the strip. */
  readonly previewStartMs: number;
  readonly previewEndMs: number;
}

interface Pacing {
  readonly durationsMs: readonly number[];
  readonly energyAt: (ms: number) => number;
  readonly liftsMs: readonly number[];
}

/**
 * Composes the slideshow's slide durations and energy curve under `shownMood`, the same way
 * `composeSlideshow` does with the energy pacing on (ADR-0046); shared by `moodEnergyPacing` and
 * `moodEnergyStripData` so the pipeline is not duplicated. Pure: `stored` is read, never changed.
 */
function composePacing(
  stored: StoredSlideshow,
  shownMood: SlideshowMood | undefined,
  beats: SongBeats,
  loudness: SongLoudness,
): Pacing {
  const units = slideUnits(stored.pictures, stored.portraitPictures);
  const mood =
    shownMood === undefined ? undefined : moodSettings(shownMood, moodTempo(stored, beats));
  const beatsMs = playlistBeatsMs(stored, beats);
  const energy = playlistEnergy(stored, loudness, beats);
  const timedPictures = units.map((unit) => timedUnit(stored.pictures, unit));
  const target = targetSecondsPerPicture(
    stored.pictureLength,
    stored.secondsPerPicture,
    mood?.secondsPerPicture,
  );
  const filledMs = picturesFillMs(playlistMs(stored), timedPictures, target, stored.repeatMusic);
  const durationsMs = slideDurationsMs(
    timedPictures,
    filledMs,
    target ?? stored.secondsPerPicture,
    beatsMs,
    energy,
  );
  return { durationsMs, energyAt: (ms: number) => energy.energyAt(ms), liftsMs: energy.liftsMs };
}

/** The range the automatic durations span, and where the first lift falls, under the energy pacing. */
export function moodEnergyPacing(
  stored: StoredSlideshow,
  shownMood: SlideshowMood | undefined,
  beats: SongBeats,
  loudness: SongLoudness,
): MoodEnergyPacing {
  const { durationsMs, liftsMs } = composePacing(stored, shownMood, beats, loudness);
  const firstLiftMs = liftsMs[0];
  return {
    minMs: Math.min(...durationsMs),
    maxMs: Math.max(...durationsMs),
    firstLiftUnitIndex:
      firstLiftMs === undefined ? undefined : unitIndexAfter(durationsMs, firstLiftMs),
  };
}

/**
 * `EnergyStrip.svelte`'s data: the whole slideshow's curve and picture-change ticks in ms, the
 * lifts in ms, and the ms stretch the Mood sheet's preview plays — around the first lift, or the
 * first `PREVIEW_PICTURE_COUNT` units without one.
 */
export function moodEnergyStripData(
  stored: StoredSlideshow,
  shownMood: SlideshowMood | undefined,
  beats: SongBeats,
  loudness: SongLoudness,
): MoodEnergyStripData {
  const { durationsMs, energyAt, liftsMs } = composePacing(stored, shownMood, beats, loudness);
  const boundariesMs = runningTotalsMs(durationsMs);
  const totalMs = boundariesMs.at(-1) ?? 0;
  const firstLiftMs = liftsMs[0];
  const startIndex = previewWindowStartIndex(
    stored.pictures.length,
    firstLiftMs === undefined ? undefined : unitIndexAfter(durationsMs, firstLiftMs),
  );
  const endIndex = Math.min(durationsMs.length, startIndex + PREVIEW_PICTURE_COUNT);
  return {
    totalMs,
    energyAt,
    tickMs: boundariesMs.slice(0, -1),
    liftsMs,
    previewStartMs: startIndex === 0 ? 0 : (boundariesMs[startIndex - 1] ?? 0),
    previewEndMs: boundariesMs[endIndex - 1] ?? totalMs,
  };
}

/** Running totals after each slide unit, so the last entry is the whole slideshow's length. */
function runningTotalsMs(durationsMs: readonly number[]): number[] {
  const boundariesMs: number[] = [];
  let total = 0;
  for (const durationMs of durationsMs) {
    total += durationMs;
    boundariesMs.push(total);
  }
  return boundariesMs;
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
