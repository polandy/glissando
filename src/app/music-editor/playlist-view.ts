import { musicExcerptMs, placeSongs, playlistMs } from "../../compose";
import { SEQUENCE_BETWEEN_SONGS } from "../../library/own-music";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import {
  slideshowTimes,
  songLoudnessStatus,
  type SongsBeatsStatus,
  type SongsLoudnessStatus,
} from "./music-editor-view";

/** The list's badge for a song's own volume (ADR-0040). */
export type SongVolumeBadge =
  | { readonly kind: "none" }
  | { readonly kind: "measuring" }
  | { readonly kind: "own"; readonly ownDb: number };

/** A song of the music editor's list and of its playlist lane. */
export interface PlaylistSongView {
  readonly id: string;
  /** Its place in the playlist, from 1. */
  readonly number: number;
  readonly fileName: string;
  readonly durationMs: number;
  /** How long its excerpt plays. */
  readonly excerptMs: number;
  /** An excerpt of the user's own; otherwise the whole track. */
  readonly trimmed: boolean;
  /** Where in the slideshow it starts. */
  readonly atMs: number;
  /** The slideshow plays it; one starting after the slideshow's end is not heard (ADR-0023). */
  readonly reached: boolean;
  readonly volumeBadge: SongVolumeBadge;
}

/** Where two songs sound at once, in slideshow time. */
export interface CrossfadeView {
  readonly atMs: number;
  readonly ms: number;
}

/** The music editor's playlist: its songs in order, and the slideshow beside it. */
export interface PlaylistView {
  readonly songs: readonly PlaylistSongView[];
  /** The songs crossfade; otherwise they play one after another. */
  readonly crossfade: boolean;
  readonly crossfades: readonly CrossfadeView[];
  /** 0 without songs. */
  readonly playlistMs: number;
  readonly slideshowMs: number;
  /** Where the pictures change, in slideshow time. */
  readonly slideChangesMs: readonly number[];
}

export function playlistView(
  stored: StoredSlideshow,
  beats: SongsBeatsStatus,
  loudness: SongsLoudnessStatus = new Map(),
): PlaylistView {
  const { durationsMs, slideshowMs } = slideshowTimes(stored, beats);
  const placed = placeSongs(stored);
  const songs = placed.map(({ song, atMs }, index) => ({
    id: song.id,
    number: index + 1,
    fileName: song.fileName,
    durationMs: song.durationMs,
    excerptMs: musicExcerptMs(song),
    trimmed: song.trim !== undefined,
    atMs,
    reached: atMs < slideshowMs,
    volumeBadge: songVolumeBadge(loudness, song.id, song.volumeDb),
  }));
  const crossfades = songs.slice(1).flatMap((next, index) => {
    // The songs before `next`: index is the previous one's.
    const previous = songs[index] as PlaylistSongView;
    const overlapMs = previous.atMs + previous.excerptMs - next.atMs;
    return overlapMs > 0 ? [{ atMs: next.atMs, ms: overlapMs }] : [];
  });
  let changeMs = 0;
  return {
    songs,
    crossfade: stored.betweenSongs !== SEQUENCE_BETWEEN_SONGS,
    crossfades,
    playlistMs: playlistMs(stored) ?? 0,
    slideshowMs,
    slideChangesMs: durationsMs.slice(0, -1).map((durationMs) => (changeMs += durationMs)),
  };
}

/** The list's badge for a song's own volume: still measuring, its own dB, or none (ADR-0040). */
function songVolumeBadge(
  loudness: SongsLoudnessStatus,
  songId: string,
  ownDb: number | undefined,
): SongVolumeBadge {
  if (songLoudnessStatus(loudness, songId).kind === "listening") {
    return { kind: "measuring" };
  }
  return ownDb === undefined ? { kind: "none" } : { kind: "own", ownDb };
}
