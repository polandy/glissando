import {
  audibleEndMs,
  automaticFadeInMs,
  automaticFadeOutMs,
  excerptBeatsMs,
  musicExcerpt,
  filledMusicMs,
  resolveMusicTiming,
  slideDurationsMs,
  type MusicTiming,
} from "../../compose";
import type { StoredMusic, StoredSlideshow } from "../../library/stored-slideshow";
import { composedBeats, type BeatsStatus } from "../beats/music-beats-known";
import {
  beatTicks,
  pictureChangesView,
  type BeatTick,
  type PictureChangesView,
} from "./picture-changes-view";

/** Why an automatic fade-in is what it is. */
export type FadeInReason = "excerpt-starts-mid-track" | "track-starts";
/** Why an automatic fade-out is what it is. */
export type FadeOutReason = "slideshow-ends" | "excerpt-ends-early" | "track-ends";

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
  readonly fileName: string;
  readonly durationMs: number;
  readonly startMs: number;
  readonly endMs: number;
  /** An excerpt of the user's own; otherwise the whole track. */
  readonly trimmed: boolean;
  readonly pictureCount: number;
  readonly slideshowMs: number;
  /** Where in the track the music stops being heard. */
  readonly audibleEndMs: number;
  /** The slide changes within the track. */
  readonly slideChanges: readonly SlideChange[];
  /** The beats the pictures change on, while they do. */
  readonly beatTicks: readonly BeatTick[];
  readonly pictureLength: PictureLengthView;
  readonly pictureChanges: PictureChangesView;
  readonly fadeIn: FadeView<FadeInReason>;
  readonly fadeOut: FadeView<FadeOutReason>;
  /** The excerpt and fades as the player plays them. */
  readonly timing: MusicTiming;
  readonly note: TimingNote;
}

export interface SlideChange {
  /** Track time. */
  readonly atMs: number;
  /** The pictures change on the beat, but this change falls between beats (an own duration). */
  readonly offBeat: boolean;
}

/** What the music editor shows of `stored`, which has music, with what is known of its beats. */
export function musicEditorView(stored: StoredSlideshow, beats: BeatsStatus): MusicEditorView {
  const music = stored.music;
  if (music === undefined) {
    throw new Error(`slideshow "${stored.id}" has no music to edit`);
  }
  const { startMs, endMs } = musicExcerpt(music);
  const beatsMs = excerptBeatsMs(music, composedBeats(beats));
  const durationsMs = slideDurationsMs(
    stored.pictures,
    filledMusicMs(stored),
    stored.secondsPerPicture,
    beatsMs,
  );
  const pictureChanges = pictureChangesView(stored, beats);
  const slideshowMs = sum(durationsMs);
  return {
    fileName: music.fileName,
    durationMs: music.durationMs,
    startMs,
    endMs,
    trimmed: music.trim !== undefined,
    pictureCount: stored.pictures.length,
    slideshowMs,
    audibleEndMs: audibleEndMs(music, slideshowMs),
    slideChanges: slideChanges(durationsMs, startMs, music.durationMs, beatsMs),
    beatTicks: beatTicks(pictureChanges, beats),
    pictureLength: {
      ownSeconds: stored.pictureLength !== undefined,
      secondsPerPicture: stored.secondsPerPicture,
    },
    pictureChanges,
    fadeIn: {
      ms: music.fadeInMs ?? automaticFadeInMs(music),
      own: music.fadeInMs !== undefined,
      reason: startMs > 0 ? "excerpt-starts-mid-track" : "track-starts",
    },
    fadeOut: {
      ms: music.fadeOutMs ?? automaticFadeOutMs(music, slideshowMs),
      own: music.fadeOutMs !== undefined,
      reason: fadeOutReason(music, slideshowMs),
    },
    timing: resolveMusicTiming(music, slideshowMs),
    note: timingNote(stored, durationsMs, endMs - startMs, beatsMs !== undefined),
  };
}

function fadeOutReason(music: StoredMusic, slideshowMs: number): FadeOutReason {
  const heardUntilMs = audibleEndMs(music, slideshowMs);
  if (heardUntilMs < musicExcerpt(music).endMs) {
    return "slideshow-ends";
  }
  return heardUntilMs < music.durationMs ? "excerpt-ends-early" : "track-ends";
}

function slideChanges(
  durationsMs: readonly number[],
  startMs: number,
  trackMs: number,
  /** In ms of the excerpt; absent while the pictures do not change on the beat. */
  beatsMs: readonly number[] | undefined,
): SlideChange[] {
  const onBeats = new Set(beatsMs);
  const changes: SlideChange[] = [];
  let excerptMs = 0;
  for (const durationMs of durationsMs.slice(0, -1)) {
    excerptMs += durationMs;
    const atMs = startMs + excerptMs;
    if (atMs < trackMs) {
      changes.push({ atMs, offBeat: beatsMs !== undefined && !onBeats.has(excerptMs) });
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
