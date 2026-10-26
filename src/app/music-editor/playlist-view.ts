import { musicExcerptMs, placeSongs, playlistMs, repeatedPlaylist } from "../../compose";
import { moodSettings, moodTempo } from "../../compose/mood-settings";
import { SEQUENCE_BETWEEN_SONGS } from "../../library/own-music";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { timingNote } from "./music-timing-note";
import {
  slideshowTimes,
  songBeats,
  songLoudnessStatus,
  type SongsBeatsStatus,
  type SongsLoudnessStatus,
} from "./slideshow-times";

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
  /**
   * Set when this song is a sample track (SAMPLE_MUSIC.md), for its row's badge. Its shape is
   * checked where it is stored, never against the current catalogue (own-music.ts).
   */
  readonly sampleTrack?: string;
  /** Set from the second time through the playlist on (`repeatMusic`, ADR-0047), for its "↻". */
  readonly repeated?: true;
}

/** Where two songs sound at once, in slideshow time. */
export interface CrossfadeView {
  readonly atMs: number;
  readonly ms: number;
}

/** The music editor's playlist: its songs in order, and the slideshow beside it. */
export interface PlaylistView {
  readonly songs: readonly PlaylistSongView[];
  /** How many songs are stored; `songs` is longer than this while the playlist repeats. */
  readonly songCount: number;
  /** The songs crossfade; otherwise they play one after another. */
  readonly crossfade: boolean;
  readonly crossfades: readonly CrossfadeView[];
  /** The playlist once through; 0 without songs (unchanged by `repeatMusic`). */
  readonly playlistMs: number;
  readonly slideshowMs: number;
  /** Where the pictures change, in slideshow time. */
  readonly slideChangesMs: readonly number[];
  /** `StoredSlideshow.repeatMusic`: the playlist above plays again for as long as pictures remain. */
  readonly repeatMusic: boolean;
  /**
   * Set when the automatic pictures shrink to end with the playlist instead of outlasting it
   * (ADR-0047): the mean shrunk share, for the lane's note. Absent while the playlist repeats,
   * since there is then nothing to fit against.
   */
  readonly fittedShareMs?: number;
  /** Set when the pictures outlast the playlist and it does not repeat: by how much. */
  readonly overMs?: number;
}

export function playlistView(
  stored: StoredSlideshow,
  beats: SongsBeatsStatus,
  loudness: SongsLoudnessStatus = new Map(),
): PlaylistView {
  const { beatsMs, durationsMs, slideshowMs, picturesFit } = slideshowTimes(
    stored,
    beats,
    loudness,
  );
  const repeatMusic = stored.repeatMusic === true;
  const originalCount = stored.songs.length;
  const placed = repeatMusic
    ? placeSongs(repeatedPlaylist(stored, slideshowMs))
    : placeSongs(stored);
  const songs = placed.map(({ song, atMs }, index) => ({
    id: song.id,
    number: (index % Math.max(originalCount, 1)) + 1,
    fileName: song.fileName,
    durationMs: song.durationMs,
    excerptMs: musicExcerptMs(song),
    trimmed: song.trim !== undefined,
    atMs,
    reached: atMs < slideshowMs,
    volumeBadge: songVolumeBadge(loudness, song.id, song.volumeDb),
    ...(song.sampleTrack !== undefined ? { sampleTrack: song.sampleTrack } : {}),
    ...(index >= originalCount ? { repeated: true as const } : {}),
  }));
  const crossfades = songs.slice(1).flatMap((next, index) => {
    // The songs before `next`: index is the previous one's.
    const previous = songs[index] as PlaylistSongView;
    const overlapMs = previous.atMs + previous.excerptMs - next.atMs;
    return overlapMs > 0 ? [{ atMs: next.atMs, ms: overlapMs }] : [];
  });
  const playlistLengthMs = playlistMs(stored) ?? 0;
  const note = repeatMusic
    ? undefined
    : timingNote(
        stored,
        durationsMs,
        playlistLengthMs,
        beatsMs !== undefined,
        picturesFit,
        moodSecondsPerPicture(stored, beats),
      );
  let changeMs = 0;
  return {
    songs,
    songCount: originalCount,
    crossfade: stored.betweenSongs !== SEQUENCE_BETWEEN_SONGS,
    crossfades,
    playlistMs: playlistLengthMs,
    slideshowMs,
    slideChangesMs: durationsMs.slice(0, -1).map((durationMs) => (changeMs += durationMs)),
    repeatMusic,
    ...(note?.kind === "fitted" ? { fittedShareMs: note.shareMs } : {}),
    ...(note?.kind === "outlasts" ? { overMs: note.overMs } : {}),
  };
}

/** What a mood would otherwise give every automatic picture, for `timingNote` (`music-editor-view.ts`'s pattern). */
function moodSecondsPerPicture(
  stored: StoredSlideshow,
  beats: SongsBeatsStatus,
): number | undefined {
  if (stored.mood === undefined) {
    return undefined;
  }
  return moodSettings(stored.mood, moodTempo(stored, songBeats(beats))).secondsPerPicture;
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
