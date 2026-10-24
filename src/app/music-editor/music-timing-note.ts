import { slideUnits } from "../../compose";
import type { StoredSlideshow } from "../../library/stored-slideshow";

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

/**
 * What the pictures' times say about the music: shared, outlasting or ending early.
 * `moodSecondsPerPicture`, under a mood, is what every automatic picture actually lasts
 * (`moodSettings` resolved against the tempo); it always wins over the single settings, which a
 * mood ignores (MOOD.md).
 */
export function timingNote(
  stored: StoredSlideshow,
  durationsMs: readonly number[],
  excerptMs: number,
  onTheBeat: boolean,
  moodSecondsPerPicture?: number,
): TimingNote {
  const slideshowMs = sum(durationsMs);
  // One entry per picture without an own duration, `durationsMs` indexed by slide: a paired
  // picture's slide holds two pictures sharing its one duration (ADR-0028), so counting by
  // picture index into `durationsMs` would miss one of every pair once pairs are composed.
  const units = slideUnits(stored.pictures, stored.portraitPictures);
  const automaticMs = units.flatMap((unit, slideIndex) =>
    unit.pictureIndices
      .filter((pictureIndex) => stored.pictures[pictureIndex]?.durationMs === undefined)
      .map(() => durationsMs[slideIndex] as number),
  );
  const secondsPerPicture = moodSecondsPerPicture ?? stored.secondsPerPicture;
  const ownSeconds =
    (moodSecondsPerPicture !== undefined || stored.pictureLength !== undefined) &&
    automaticMs.length > 0;
  if (slideshowMs > excerptMs) {
    return {
      kind: "outlasts",
      overMs: slideshowMs - excerptMs,
      automaticCount: automaticMs.length,
      ...(ownSeconds ? { secondsPerPicture } : {}),
    };
  }
  if (ownSeconds) {
    return {
      kind: "own-seconds",
      secondsPerPicture,
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

export function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
