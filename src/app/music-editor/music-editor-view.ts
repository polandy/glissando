import {
  AUTOMATIC_MUSIC_FADE_MS,
  filledMusicMs,
  musicExcerpt,
  placeSongs,
  playlistBeatsMs,
  playlistMs,
  scaledFades,
  slideDurationsMs,
  type MusicTiming,
  type PlacedSong,
} from "../../compose";
import { SEQUENCE_BETWEEN_SONGS } from "../../library/own-music";
import { songIndex } from "../../library/slideshow-edits-songs";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { composedBeats, type BeatsStatus } from "../beats/music-beats-known";
import {
  beatTicks,
  pictureChangesView,
  type BeatTick,
  type PictureChangesView,
} from "./picture-changes-view";

/** Why an automatic fade-in is what it is. */
export type FadeInReason = "excerpt-starts-mid-track" | "track-starts" | "crossfade-from-previous";
/** Why an automatic fade-out is what it is. */
export type FadeOutReason =
  "slideshow-ends" | "excerpt-ends-early" | "track-ends" | "crossfade-into-next";

export interface FadeView<Reason> {
  /** The choice shown: the own fade, or the automatic one. */
  readonly ms: number;
  readonly own: boolean;
  /** Why the automatic choice is what it is, also while an own one is set. */
  readonly reason: Reason;
}

/** How the pictures' times meet the excerpt. */
export type TimingNote =
  /**
   * The pictures without an own duration share the excerpt, `shareMs` each on average; on the beat
   * their shares vary around it.
   */
  | {
      readonly kind: "shared";
      readonly automaticCount: number;
      readonly shareMs: number;
      readonly onTheBeat: boolean;
    }
  /**
   * The slideshow plays on in silence for `overMs` after the music: the automatic pictures last
   * their own `secondsPerPicture`, or (absent) the share fell to the minimum.
   */
  | {
      readonly kind: "outlasts";
      readonly overMs: number;
      readonly automaticCount: number;
      readonly secondsPerPicture?: number;
    }
  /**
   * The pictures without an own duration last their own seconds, about that on the beat; the
   * slideshow, and with it the music, ends at `slideshowMs`.
   */
  | {
      readonly kind: "own-seconds";
      readonly secondsPerPicture: number;
      readonly onTheBeat: boolean;
      readonly slideshowMs: number;
    }
  /** Every picture is timed; the slideshow, and with it the music, ends at `endsAtMs`. */
  | { readonly kind: "ends-early"; readonly endsAtMs: number }
  /** Every picture is timed, together exactly as long as the excerpt. */
  | { readonly kind: "ends-with-music" };

/** How long the pictures without an own duration last (ADR-0022). */
export interface PictureLengthView {
  /** They last `secondsPerPicture` each; otherwise they fill the music. */
  readonly ownSeconds: boolean;
  readonly secondsPerPicture: number;
}

export interface MusicEditorView {
  readonly songId: string;
  /** Its place in the playlist, from 1. */
  readonly songNumber: number;
  /** The slideshow plays it; a song starting after the slideshow's end is not heard. */
  readonly reached: boolean;
  /** Where in the slideshow it starts. */
  readonly atMs: number;
  /** The playlist's last song: past its end the pictures play on in silence. */
  readonly last: boolean;
  readonly fileName: string;
  readonly durationMs: number;
  readonly startMs: number;
  readonly endMs: number;
  /** An excerpt of the user's own; otherwise the whole track. */
  readonly trimmed: boolean;
  readonly pictureCount: number;
  readonly slideshowMs: number;
  /** Where in the track the song stops being heard. */
  readonly audibleEndMs: number;
  /** The slide changes while the song plays, in track time. */
  readonly slideChanges: readonly SlideChange[];
  /** The beats the pictures change on, while they do. */
  readonly beatTicks: readonly BeatTick[];
  readonly pictureLength: PictureLengthView;
  readonly pictureChanges: PictureChangesView;
  readonly fadeIn: FadeView<FadeInReason>;
  readonly fadeOut: FadeView<FadeOutReason>;
  /** The excerpt and fades as the player plays them in the playlist. */
  readonly timing: MusicTiming;
  readonly note: TimingNote;
}

export interface SlideChange {
  /** Track time. */
  readonly atMs: number;
  /** The pictures change on the beat, but this change falls between beats (an own duration). */
  readonly offBeat: boolean;
}

/** What is known of each song's beats; a song absent is still being listened for. */
export type SongsBeatsStatus = ReadonlyMap<string, BeatsStatus>;

const LISTENING: BeatsStatus = { kind: "listening" };

/** What is known of the song's beats. */
export function songBeatsStatus(beats: SongsBeatsStatus, songId: string): BeatsStatus {
  return beats.get(songId) ?? LISTENING;
}

/** The pictures' times over the whole playlist, with what is known of the songs' beats. */
export interface SlideshowTimes {
  /** In ms of the playlist; absent while no song gives beats to change on. */
  readonly beatsMs: readonly number[] | undefined;
  readonly durationsMs: readonly number[];
  readonly slideshowMs: number;
}

export function slideshowTimes(stored: StoredSlideshow, beats: SongsBeatsStatus): SlideshowTimes {
  const found = new Map(
    stored.songs.map(({ id }) => [id, composedBeats(songBeatsStatus(beats, id))]),
  );
  const beatsMs = playlistBeatsMs(stored, found);
  const durationsMs = slideDurationsMs(
    stored.pictures,
    filledMusicMs(stored),
    stored.secondsPerPicture,
    beatsMs,
  );
  return { beatsMs, durationsMs, slideshowMs: sum(durationsMs) };
}

/**
 * What the music editor shows of the song `songId` of `stored`, with what is known of the songs'
 * beats; the pictures' times are the whole playlist's (ADR-0023).
 */
export function musicEditorView(
  stored: StoredSlideshow,
  beats: SongsBeatsStatus,
  songId: string,
): MusicEditorView {
  const index = songIndex(stored, songId);
  const placed = placeSongs(stored);
  // songIndex only returns the index of a song the playlist has.
  const { song: music, atMs, fadeInMs, fadeOutMs } = placed[index] as PlacedSong;
  const { startMs, endMs } = musicExcerpt(music);
  const { beatsMs, durationsMs, slideshowMs } = slideshowTimes(stored, beats);
  const status = songBeatsStatus(beats, songId);
  const pictureChanges = pictureChangesView(stored, music, status);
  const reached = atMs < slideshowMs;
  const heardEndMs = reached ? Math.min(endMs, startMs + slideshowMs - atMs) : endMs;
  const cutBySlideshow = heardEndMs < endMs;
  const automaticFadeOutMs = cutBySlideshow ? AUTOMATIC_MUSIC_FADE_MS : fadeOutMs;
  const playlistLengthMs = playlistMs(stored) ?? 0;
  const joinsPrevious = index > 0 && stored.betweenSongs !== SEQUENCE_BETWEEN_SONGS;
  const joinsNext =
    index < stored.songs.length - 1 && stored.betweenSongs !== SEQUENCE_BETWEEN_SONGS;
  return {
    songId,
    songNumber: index + 1,
    reached,
    atMs,
    last: index === stored.songs.length - 1,
    fileName: music.fileName,
    durationMs: music.durationMs,
    startMs,
    endMs,
    trimmed: music.trim !== undefined,
    pictureCount: stored.pictures.length,
    slideshowMs,
    audibleEndMs: heardEndMs,
    slideChanges: slideChanges(durationsMs, atMs, startMs, heardEndMs, beatsMs),
    beatTicks: beatTicks(pictureChanges, status),
    pictureLength: {
      ownSeconds: stored.pictureLength !== undefined,
      secondsPerPicture: stored.secondsPerPicture,
    },
    pictureChanges,
    fadeIn: {
      ms: fadeInMs,
      own: music.fadeInMs !== undefined,
      reason: joinsPrevious
        ? "crossfade-from-previous"
        : startMs > 0
          ? "excerpt-starts-mid-track"
          : "track-starts",
    },
    fadeOut: {
      ms: music.fadeOutMs ?? automaticFadeOutMs,
      own: music.fadeOutMs !== undefined,
      reason: cutBySlideshow
        ? "slideshow-ends"
        : joinsNext
          ? "crossfade-into-next"
          : endMs < music.durationMs
            ? "excerpt-ends-early"
            : "track-ends",
    },
    timing: {
      startMs,
      endMs: heardEndMs,
      ...scaledFades(heardEndMs - startMs, fadeInMs, music.fadeOutMs ?? automaticFadeOutMs),
    },
    note: timingNote(stored, durationsMs, playlistLengthMs, beatsMs !== undefined),
  };
}

/** The slide changes heard in the song, which starts at `atMs` of the slideshow, in track time. */
function slideChanges(
  durationsMs: readonly number[],
  atMs: number,
  startMs: number,
  heardEndMs: number,
  /** In ms of the playlist; absent while the pictures do not change on the beat. */
  beatsMs: readonly number[] | undefined,
): SlideChange[] {
  const onBeats = new Set(beatsMs);
  const changes: SlideChange[] = [];
  let slideshowMs = 0;
  for (const durationMs of durationsMs.slice(0, -1)) {
    slideshowMs += durationMs;
    const trackMs = startMs + slideshowMs - atMs;
    if (trackMs > startMs && trackMs < heardEndMs) {
      changes.push({
        atMs: trackMs,
        offBeat: beatsMs !== undefined && !onBeats.has(slideshowMs),
      });
    }
  }
  return changes;
}

function timingNote(
  stored: StoredSlideshow,
  durationsMs: readonly number[],
  excerptMs: number,
  onTheBeat: boolean,
): TimingNote {
  const slideshowMs = sum(durationsMs);
  const automaticMs = durationsMs.filter(
    (_, index) => stored.pictures[index]?.durationMs === undefined,
  );
  const ownSeconds = stored.pictureLength !== undefined && automaticMs.length > 0;
  if (slideshowMs > excerptMs) {
    return {
      kind: "outlasts",
      overMs: slideshowMs - excerptMs,
      automaticCount: automaticMs.length,
      ...(ownSeconds ? { secondsPerPicture: stored.secondsPerPicture } : {}),
    };
  }
  if (ownSeconds) {
    return {
      kind: "own-seconds",
      secondsPerPicture: stored.secondsPerPicture,
      onTheBeat,
      slideshowMs,
    };
  }
  if (automaticMs.length > 0) {
    return {
      kind: "shared",
      automaticCount: automaticMs.length,
      // The mean, rounded down: evenly, the smallest share.
      shareMs: Math.floor(sum(automaticMs) / automaticMs.length),
      onTheBeat,
    };
  }
  return slideshowMs < excerptMs
    ? { kind: "ends-early", endsAtMs: slideshowMs }
    : { kind: "ends-with-music" };
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
