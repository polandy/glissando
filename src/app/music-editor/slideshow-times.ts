import {
  filledMusicMs,
  playlistBeatsMs,
  slideDurationsMs,
  slideUnits,
  timedUnit,
  type SongBeats,
} from "../../compose";
import { playlistEnergy } from "../../compose/energy/playlist-energy";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { composedBeats, type BeatsStatus } from "../beats/music-beats-known";
import { composedLoudness, type LoudnessStatus } from "../loudness/music-loudness-known";
import { sum } from "./music-timing-note";

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
}

/**
 * `loudness`, with what is known of it, re-paces the automatic slides by the playlist's energy
 * while `stored.energyPacing` is set (ADR-0046), so the editor's times match the player's.
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
  const units = slideUnits(stored.pictures, stored.portraitPictures);
  const durationsMs = slideDurationsMs(
    units.map((unit) => timedUnit(stored.pictures, unit)),
    filledMusicMs(stored),
    stored.secondsPerPicture,
    beatsMs,
    energy,
  );
  return { beatsMs, durationsMs, slideshowMs: sum(durationsMs) };
}
