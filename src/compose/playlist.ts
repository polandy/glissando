import { NO_BEATS, type MusicBeats } from "../beats";
import { MUSIC_FADE_OFF_MS, SEQUENCE_BETWEEN_SONGS } from "../library/own-music";
import type { StoredMusic, StoredSlideshow } from "../library/stored-slideshow";
import { MILLISECONDS_PER_SECOND } from "../player/slideshow";
import { excerptBeatsMs } from "./excerpt-beats";
import {
  AUTOMATIC_MUSIC_FADE_OUT_MS,
  automaticFadeInMs,
  musicExcerpt,
  musicExcerptMs,
  scaledFades,
  type MusicTiming,
} from "./music-excerpt";

/**
 * Where each song of the playlist plays and how it fades into the next, resolved from the stored
 * songs and the slideshow's length (ADR-0023): the player only receives these numbers.
 */

/** An automatic fade on either side of a crossfade's join. */
export const CROSSFADE_MS = 3 * MILLISECONDS_PER_SECOND;

/** What the playlist is made of. */
export type Playlist = Pick<StoredSlideshow, "songs" | "betweenSongs">;

/** The beats found so far per music id; a song absent was not listened to yet. */
export type SongBeats = ReadonlyMap<string, MusicBeats>;

/** Before any song was listened to. */
export const NO_SONG_BEATS: SongBeats = new Map();

/** A song as it plays: `atMs` in slideshow time, the rest in ms of its track. */
export interface PlaylistTrack extends MusicTiming {
  readonly song: StoredMusic;
  readonly atMs: number;
}

/** A song placed in the whole playlist, before the slideshow's end cuts it. */
export interface PlacedSong {
  readonly song: StoredMusic;
  readonly atMs: number;
  /** The fades over the whole excerpt, own or automatic, not yet scaled. */
  readonly fadeInMs: number;
  readonly fadeOutMs: number;
}

/**
 * The tracks the slideshow plays, `slideshowMs` long: every song it reaches, the one heard at its
 * end cut there and fading out (own fade-out, or automatic as in ADR-0009). Fades that together
 * outlast what is heard of a song are scaled down in proportion. `minEndFadeMs` (a closing card's
 * `endFadeMs`, `TITLE_CARD_COMPOSITION.md`) raises the last track's fade-out so it lasts at
 * least that long into the show's end.
 */
export function resolvePlaylist(
  playlist: Playlist,
  slideshowMs: number,
  minEndFadeMs?: number,
): PlaylistTrack[] {
  const tracks = placeSongs(playlist).filter(({ atMs }) => atMs < slideshowMs);
  return tracks.map(({ song, atMs, fadeInMs, fadeOutMs }, index) => {
    const excerpt = musicExcerpt(song);
    const endMs = Math.min(excerpt.endMs, excerpt.startMs + slideshowMs - atMs);
    const cutBySlideshowEnd = endMs < excerpt.endMs;
    const floorMs = index === tracks.length - 1 ? (minEndFadeMs ?? 0) : 0;
    const heardFadeOutMs = Math.max(
      cutBySlideshowEnd ? (song.fadeOutMs ?? AUTOMATIC_MUSIC_FADE_OUT_MS) : fadeOutMs,
      floorMs,
    );
    return {
      song,
      atMs,
      startMs: excerpt.startMs,
      endMs,
      ...scaledFades(endMs - excerpt.startMs, fadeInMs, heardFadeOutMs),
    };
  });
}

/**
 * The length the pictures without an own duration share: the playlist's while they fill it
 * (`StoredSlideshow.pictureLength` absent, ADR-0022). Absent without songs, or when they last
 * their own seconds.
 */
export function filledMusicMs(
  slideshow: Playlist & Pick<StoredSlideshow, "pictureLength">,
): number | undefined {
  return slideshow.pictureLength === undefined ? playlistMs(slideshow) : undefined;
}

/**
 * How long the playlist plays: the excerpts' sum less the crossfades' overlaps; what "Fill the
 * music" fills (ADR-0023). Absent without songs.
 */
export function playlistMs(playlist: Playlist): number | undefined {
  const last = placeSongs(playlist).at(-1);
  return last === undefined ? undefined : last.atMs + musicExcerptMs(last.song);
}

/**
 * The beats the pictures change on, in ms of the playlist: each song's excerpt beats placed at
 * its start; inside an overlap only the incoming song's. A song with even picture changes, without
 * a clear beat or not listened to yet gives none; absent when no song gives any (ADR-0023).
 */
export function playlistBeatsMs(
  playlist: Playlist,
  beats: SongBeats,
): readonly number[] | undefined {
  const placed = placeSongs(playlist);
  const perSong = placed.map(({ song, atMs }, index) => {
    const songBeatsMs = excerptBeatsMs(song, beats.get(song.id) ?? NO_BEATS);
    const nextAtMs = placed[index + 1]?.atMs ?? Number.POSITIVE_INFINITY;
    return songBeatsMs?.map((beatMs) => atMs + beatMs).filter((beatMs) => beatMs < nextAtMs);
  });
  if (perSong.every((songBeatsMs) => songBeatsMs === undefined)) {
    return undefined;
  }
  return perSong.flatMap((songBeatsMs) => songBeatsMs ?? []);
}

/**
 * Places every song, each starting where the previous one's fade-out starts in a crossfade, at its
 * end one after another. An overlap is capped so that no song outlasts the next and at most two
 * sound at once.
 */
export function placeSongs({ songs, betweenSongs }: Playlist): PlacedSong[] {
  const crossfade = betweenSongs !== SEQUENCE_BETWEEN_SONGS;
  const placed: PlacedSong[] = [];
  let atMs = 0;
  let previousEndMs = 0;
  songs.forEach((song, index) => {
    const next = songs[index + 1];
    const joinsPrevious = crossfade && index > 0;
    const joinsNext = crossfade && next !== undefined;
    const fadeInMs = song.fadeInMs ?? (joinsPrevious ? CROSSFADE_MS : automaticFadeInMs(song));
    const fadeOutMs = song.fadeOutMs ?? (joinsNext ? CROSSFADE_MS : endFadeOutMs(song));
    placed.push({ song, atMs, fadeInMs, fadeOutMs });
    const excerptMs = musicExcerptMs(song);
    const endMs = atMs + excerptMs;
    const overlapMs =
      next === undefined || !joinsNext
        ? 0
        : Math.min(
            scaledFades(excerptMs, fadeInMs, fadeOutMs).fadeOutMs,
            endMs - previousEndMs,
            musicExcerptMs(next),
          );
    previousEndMs = endMs;
    atMs = endMs - overlapMs;
  });
  return placed;
}

/** A song's own end as in ADR-0009: long where the excerpt stops before the track's end. */
function endFadeOutMs(song: StoredMusic): number {
  return musicExcerpt(song).endMs < song.durationMs
    ? AUTOMATIC_MUSIC_FADE_OUT_MS
    : MUSIC_FADE_OFF_MS;
}
