import { NO_BEATS } from "../../beats";
import { EVEN_PICTURE_CHANGES } from "../../library/own-music";
import { LOUDNESS_HOP_MS, type MusicLoudness } from "../../loudness";
import { excerptBeatsMs } from "../excerpt-beats";
import { musicExcerpt, musicExcerptMs } from "../music-excerpt";
import { placeSongs, repeatedPlaylist, type Playlist, type SongBeats } from "../playlist";
import type { SongLoudness } from "../song-loudness";
import {
  NEUTRAL_ENERGY,
  songEnergyAt,
  songEnergyRange,
  type SongEnergyRange,
} from "./energy-curve";
import { songLiftsMs } from "./lifts";

/** How loud the playlist sounds moment to moment, and where its lifts are (ADR-0046). */
export interface PlaylistEnergy {
  /** The energy at `ms` of the playlist, `NEUTRAL_ENERGY` outside any usable song. */
  energyAt(ms: number): number;
  /** The mean energy over `[fromMs, toMs)`, sampled every `LOUDNESS_HOP_MS` from `fromMs`. */
  meanEnergy(fromMs: number, toMs: number): number;
  /** Every lift found across the playlist's songs, in playlist ms, ascending. */
  readonly liftsMs: readonly number[];
}

/** A song's reach in playlist ms, and what it takes to read its energy, if it is usable at all. */
type SongSpan =
  | { readonly atMs: number; readonly territoryEndMs: number; readonly usable: false }
  | {
      readonly atMs: number;
      readonly territoryEndMs: number;
      readonly usable: true;
      readonly excerptStartMs: number;
      readonly excerptEndMs: number;
      readonly loudness: MusicLoudness;
      readonly range: SongEnergyRange;
    };

/**
 * The playlist's energy and lifts, placed like `playlistBeatsMs` (`placeSongs`): inside a
 * crossfade's overlap, the incoming song's span wins. A song that is `pictureChanges: "even"`,
 * was not measured, or is flat (`songEnergyRange` gives `null`) reads as `NEUTRAL_ENERGY` and
 * contributes no lifts, over the whole span it would otherwise own. `slideshowMs`, when the
 * playlist repeats, reaches as far into the repeats as it needs (`repeatedPlaylist`).
 */
export function playlistEnergy(
  playlist: Playlist,
  loudness: SongLoudness,
  beats: SongBeats,
  slideshowMs?: number,
): PlaylistEnergy {
  const placed = placeSongs(
    slideshowMs === undefined ? playlist : repeatedPlaylist(playlist, slideshowMs),
  );
  const spans = placed.map(({ song, atMs }, index): SongSpan => {
    const excerpt = musicExcerpt(song);
    const territoryEndMs = placed[index + 1]?.atMs ?? atMs + musicExcerptMs(song);
    const songLoudness = loudness.get(song.id);
    const range =
      songLoudness === undefined
        ? null
        : songEnergyRange(songLoudness, excerpt.startMs, excerpt.endMs);
    if (
      song.pictureChanges === EVEN_PICTURE_CHANGES ||
      songLoudness === undefined ||
      range === null
    ) {
      return { atMs, territoryEndMs, usable: false };
    }
    return {
      atMs,
      territoryEndMs,
      usable: true,
      excerptStartMs: excerpt.startMs,
      excerptEndMs: excerpt.endMs,
      loudness: songLoudness,
      range,
    };
  });

  const liftsMs = placed
    .flatMap(({ song, atMs }, index) => {
      const span = spans[index];
      if (span === undefined || !span.usable) {
        return [];
      }
      const songBeatsMs = excerptBeatsMs(song, beats.get(song.id) ?? NO_BEATS);
      return songLiftsMs(
        span.loudness,
        span.range.liftLevelLufs,
        span.excerptStartMs,
        span.excerptEndMs,
        songBeatsMs,
      )
        .map((liftMs) => atMs + liftMs)
        .filter((liftMs) => liftMs < span.territoryEndMs);
    })
    .sort((a, b) => a - b);

  function energyAt(ms: number): number {
    const span = spans.find((candidate) => ms >= candidate.atMs && ms < candidate.territoryEndMs);
    if (span === undefined || !span.usable) {
      return NEUTRAL_ENERGY;
    }
    const trackMs = span.excerptStartMs + (ms - span.atMs);
    return songEnergyAt(span.loudness, span.range, trackMs, span.excerptStartMs, span.excerptEndMs);
  }

  function meanEnergy(fromMs: number, toMs: number): number {
    const samples: number[] = [];
    for (let ms = fromMs; ms < toMs; ms += LOUDNESS_HOP_MS) {
      samples.push(energyAt(ms));
    }
    if (samples.length === 0) {
      samples.push(energyAt(fromMs));
    }
    return samples.reduce((sum, value) => sum + value, 0) / samples.length;
  }

  return { energyAt, meanEnergy, liftsMs };
}
