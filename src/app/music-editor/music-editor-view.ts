import {
  audibleEndMs,
  automaticFadeInMs,
  automaticFadeOutMs,
  musicExcerpt,
  musicExcerptMs,
  resolveMusicTiming,
  slideDurationsMs,
  type MusicTiming,
} from "../../compose";
import type { StoredMusic, StoredSlideshow } from "../../library/stored-slideshow";

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
  /** The pictures without an own duration share the excerpt, `shareMs` each. */
  | { readonly kind: "shared"; readonly automaticCount: number; readonly shareMs: number }
  /** The slideshow plays on in silence for `overMs` after the music. */
  | { readonly kind: "outlasts"; readonly overMs: number; readonly automaticCount: number }
  /** Every picture is timed; the slideshow, and with it the music, ends at `endsAtMs`. */
  | { readonly kind: "ends-early"; readonly endsAtMs: number }
  /** Every picture is timed, together exactly as long as the excerpt. */
  | { readonly kind: "ends-with-music" };

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
  /** Track times of the slide changes, within the track. */
  readonly slideChangesMs: readonly number[];
  readonly fadeIn: FadeView<FadeInReason>;
  readonly fadeOut: FadeView<FadeOutReason>;
  /** The excerpt and fades as the player plays them. */
  readonly timing: MusicTiming;
  readonly note: TimingNote;
}

/** What the music editor shows of `stored`, which has music. */
export function musicEditorView(stored: StoredSlideshow): MusicEditorView {
  const music = stored.music;
  if (music === undefined) {
    throw new Error(`slideshow "${stored.id}" has no music to edit`);
  }
  const { startMs, endMs } = musicExcerpt(music);
  const durationsMs = slideDurationsMs(
    stored.pictures,
    musicExcerptMs(music),
    stored.secondsPerPicture,
  );
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
    slideChangesMs: slideChanges(durationsMs, startMs, music.durationMs),
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
    note: timingNote(stored, durationsMs, endMs - startMs),
  };
}

function fadeOutReason(music: StoredMusic, slideshowMs: number): FadeOutReason {
  const heardUntilMs = audibleEndMs(music, slideshowMs);
  if (heardUntilMs < musicExcerpt(music).endMs) {
    return "slideshow-ends";
  }
  return heardUntilMs < music.durationMs ? "excerpt-ends-early" : "track-ends";
}

function slideChanges(durationsMs: readonly number[], startMs: number, trackMs: number): number[] {
  const changes: number[] = [];
  let atMs = startMs;
  for (const durationMs of durationsMs.slice(0, -1)) {
    atMs += durationMs;
    if (atMs < trackMs) {
      changes.push(atMs);
    }
  }
  return changes;
}

function timingNote(
  stored: StoredSlideshow,
  durationsMs: readonly number[],
  excerptMs: number,
): TimingNote {
  const slideshowMs = sum(durationsMs);
  const automaticMs = durationsMs.filter(
    (_, index) => stored.pictures[index]?.durationMs === undefined,
  );
  if (slideshowMs > excerptMs) {
    return {
      kind: "outlasts",
      overMs: slideshowMs - excerptMs,
      automaticCount: automaticMs.length,
    };
  }
  if (automaticMs.length > 0) {
    return {
      kind: "shared",
      automaticCount: automaticMs.length,
      shareMs: Math.min(...automaticMs),
    };
  }
  return slideshowMs < excerptMs
    ? { kind: "ends-early", endsAtMs: slideshowMs }
    : { kind: "ends-with-music" };
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
