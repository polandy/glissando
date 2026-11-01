import {
  AUTOMATIC_MUSIC_FADE_OUT_MS,
  musicExcerpt,
  placeSongs,
  resolvePlaylist,
  scaledFades,
  type MusicTiming,
  type PlacedSong,
} from "../../compose";
import { moodTempo } from "../../compose/mood-settings";
import { SEQUENCE_BETWEEN_SONGS } from "../../library/own-music";
import { songIndex } from "../../library/slideshow-edits-songs";
import type { SlideshowMood } from "../../library/slideshow-mood";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { excerptLoudnessLufs, excerptPeakDbfs } from "../../loudness";
import { volumeListenPlan, type VolumeListenPlan } from "./listen-preview";
import {
  beatTicks,
  pictureChangesView,
  type BeatTick,
  type PictureChangesView,
} from "./picture-changes-view";
import {
  NO_SONGS_LOUDNESS_KNOWN,
  slideshowTimes,
  songBeats,
  songBeatsStatus,
  songLoudnessStatus,
  type SongsBeatsStatus,
  type SongsLoudnessStatus,
} from "./slideshow-times";
import { volumeView, volumeViewInput, type VolumeView } from "./volume-view";

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

/** How long the pictures without an own duration last (ADR-0022). */
export interface PictureLengthView {
  /** They last `secondsPerPicture` each; otherwise they fill the music. */
  readonly ownSeconds: boolean;
  readonly secondsPerPicture: number;
}

/** The slideshow's mood pacing the picture length instead of `PictureLengthView` (ADR-0045). */
export interface MoodPictureLengthView {
  readonly mood: SlideshowMood;
  /** The tempo the mood paces to; absent without a song that gives one (`moodTempo`). */
  readonly beatsPerMinute: number | undefined;
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
  /** Set instead of `pictureLength` while the slideshow has a mood (ADR-0045). */
  readonly moodPictureLength: MoodPictureLengthView | undefined;
  readonly pictureChanges: PictureChangesView;
  readonly fadeIn: FadeView<FadeInReason>;
  readonly fadeOut: FadeView<FadeOutReason>;
  readonly volume: VolumeView;
  /** What "Listen" (at this volume, from the loudest part) plays. */
  readonly volumeListen: VolumeListenPlan;
  /** The excerpt and fades as the player plays them in the playlist. */
  readonly timing: MusicTiming;
}

export interface SlideChange {
  /** Track time. */
  readonly atMs: number;
  /** The pictures change on the beat, but no beat fits close enough to move this change onto. */
  readonly offBeat: boolean;
}

/**
 * What the music editor shows of the song `songId` of `stored`, with what is known of the songs'
 * beats and loudness; the pictures' times are the whole playlist's (ADR-0023).
 */
export function musicEditorView(
  stored: StoredSlideshow,
  beats: SongsBeatsStatus,
  songId: string,
  loudness: SongsLoudnessStatus = NO_SONGS_LOUDNESS_KNOWN,
): MusicEditorView {
  const index = songIndex(stored, songId);
  const placed = placeSongs(stored);
  // songIndex only returns the index of a song the playlist has.
  const { song: music, atMs, fadeInMs, fadeOutMs } = placed[index] as PlacedSong;
  const { startMs, endMs } = musicExcerpt(music);
  const { beatsMs, durationsMs, slideshowMs } = slideshowTimes(stored, beats, loudness);
  const status = songBeatsStatus(beats, songId);
  const pictureChanges = pictureChangesView(stored, music, status);
  const loudnessStatus = songLoudnessStatus(loudness, songId);
  const loudnessOfExcerpt = loudnessStatus.kind === "known" ? loudnessStatus.loudness : undefined;
  const volume = volumeView(
    volumeViewInput(
      loudnessStatus,
      loudnessOfExcerpt === undefined
        ? null
        : excerptLoudnessLufs(loudnessOfExcerpt, startMs, endMs),
      loudnessOfExcerpt === undefined ? null : excerptPeakDbfs(loudnessOfExcerpt, startMs, endMs),
      music.volumeDb ?? 0,
    ),
  );
  const volumeListen = volumeListenPlan({
    startMs,
    endMs,
    loudness: loudnessOfExcerpt ?? null,
    gainDb: volume.gainDb,
  });
  // The songs the slideshow reaches come first, so the index is the same among them.
  const resolved = resolvePlaylist(stored, slideshowMs)[index];
  const reached = resolved !== undefined;
  const timing: MusicTiming = resolved ?? {
    startMs,
    endMs,
    ...scaledFades(endMs - startMs, fadeInMs, fadeOutMs),
  };
  const heardEndMs = timing.endMs;
  const cutBySlideshow = heardEndMs < endMs;
  const automaticFadeOutMs = cutBySlideshow ? AUTOMATIC_MUSIC_FADE_OUT_MS : fadeOutMs;
  const joinsPrevious = index > 0 && stored.betweenSongs !== SEQUENCE_BETWEEN_SONGS;
  const joinsNext =
    index < stored.songs.length - 1 && stored.betweenSongs !== SEQUENCE_BETWEEN_SONGS;
  const moodBeatsPerMinute =
    stored.mood === undefined ? undefined : moodTempo(stored, songBeats(beats));
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
    moodPictureLength:
      stored.mood === undefined
        ? undefined
        : { mood: stored.mood, beatsPerMinute: moodBeatsPerMinute },
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
    volume,
    volumeListen,
    timing: { startMs, endMs: heardEndMs, fadeInMs: timing.fadeInMs, fadeOutMs: timing.fadeOutMs },
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
