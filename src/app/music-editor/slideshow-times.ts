import {
  playlistBeatsMs,
  playlistMs,
  slideDurationsMs,
  slideUnits,
  timedUnit,
  type SongBeats,
} from "../../compose";
import { playlistEnergy } from "../../compose/energy/playlist-energy";
import { picturesFillMs, targetSecondsPerPicture } from "../../compose/filled-length";
import { moodSettings, moodTempo } from "../../compose/mood-settings";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { composedBeats, type BeatsStatus } from "../beats/music-beats-known";
import { composedLoudness, type LoudnessStatus } from "../loudness/music-loudness-known";
import { sum } from "./picture-fit";

/** What is known of each song's beats; a song absent is still being listened for. */
export type SongsBeatsStatus = ReadonlyMap<string, BeatsStatus>;

/** What is known of each song's loudness; a song absent is still being listened for. */
export type SongsLoudnessStatus = ReadonlyMap<string, LoudnessStatus>;

const LISTENING: BeatsStatus = { kind: "listening" };
const LISTENING_FOR_LOUDNESS: LoudnessStatus = { kind: "listening" };

/** Before any song's loudness is known. */
export const NO_SONGS_LOUDNESS_KNOWN: SongsLoudnessStatus = new Map();

/** What is known of the song's beats. */
export function songBeatsStatus(beats: SongsBeatsStatus, songId: string): BeatsStatus {
  return beats.get(songId) ?? LISTENING;
}

/** `beats` composed for `moodTempo`/`playlistEnergy`, which pace with a found tempo as soon as known. */
export function songBeats(beats: SongsBeatsStatus): SongBeats {
  return new Map([...beats].map(([songId, status]) => [songId, composedBeats(status)]));
}

/** What is known of the song's loudness. */
export function songLoudnessStatus(loudness: SongsLoudnessStatus, songId: string): LoudnessStatus {
  return loudness.get(songId) ?? LISTENING_FOR_LOUDNESS;
}

/**
 * The slides' times over the whole playlist, with what is known of the songs' beats; one entry
 * per slide, a composed pair counting as one (ADR-0028), which is what the timeline's slide
 * changes are positioned on.
 */
export interface SlideshowTimes {
  /** In ms of the playlist; absent while no song gives beats to change on. */
  readonly beatsMs: readonly number[] | undefined;
  readonly durationsMs: readonly number[];
  readonly slideshowMs: number;
  /** Whether the automatic pictures fill the excerpt, or fit a shorter one (`picturesFillMs`). */
  readonly picturesFit: boolean;
}

/**
 * `loudness`, with what is known of it, re-paces the automatic slides by the playlist's energy
 * while `stored.energyPacing` is set (ADR-0046), so the editor's times match the player's. Own
 * seconds or a mood shrink to fit a shorter excerpt instead of outlasting it where they can
 * (ADR-0047).
 */
export function slideshowTimes(
  stored: StoredSlideshow,
  beats: SongsBeatsStatus,
  loudness: SongsLoudnessStatus = NO_SONGS_LOUDNESS_KNOWN,
): SlideshowTimes {
  const found = new Map(
    stored.songs.map(({ id }) => [id, composedBeats(songBeatsStatus(beats, id))]),
  );
  const beatsMs = playlistBeatsMs(stored, found);
  const energy =
    stored.energyPacing === true
      ? playlistEnergy(stored, composedLoudness(loudness), found)
      : undefined;
  const mood =
    stored.mood === undefined ? undefined : moodSettings(stored.mood, moodTempo(stored, found));
  const units = slideUnits(stored.pictures, stored.portraitPictures);
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
  return {
    beatsMs,
    durationsMs,
    slideshowMs: sum(durationsMs),
    picturesFit: filledMs !== undefined,
  };
}
