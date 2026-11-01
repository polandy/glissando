import { slideUnits } from "../../compose";
import type { StoredSlideshow } from "../../library/stored-slideshow";

/** How the pictures' times meet the music, as far as the picture-length notice tells. */
export interface PictureFit {
  /** The automatic pictures shrank to end with the music, this long each on average. */
  readonly fittedShareMs?: number;
  /** The slideshow plays on in silence for this long after the music. */
  readonly overMs?: number;
}

/**
 * Whether the pictures end with the music (`fittedShareMs`, ADR-0047) or outlast it (`overMs`).
 * `moodSecondsPerPicture`, under a mood, is what every automatic picture would otherwise last
 * (`moodSettings` resolved against the tempo); it always wins over the single settings, which a
 * mood ignores (MOOD.md). `picturesFit` (`SlideshowTimes.picturesFit`) says whether own seconds
 * or the mood shrink to end with the music instead.
 */
export function pictureFit(
  stored: StoredSlideshow,
  durationsMs: readonly number[],
  musicMs: number,
  picturesFit: boolean,
  moodSecondsPerPicture?: number,
): PictureFit {
  // One entry per picture without an own duration, `durationsMs` indexed by slide: a paired
  // picture's slide holds two pictures sharing its one duration (ADR-0028), so counting by
  // picture index into `durationsMs` would miss one of every pair once pairs are composed.
  const units = slideUnits(stored.pictures, stored.portraitPictures);
  const automaticMs = units.flatMap((unit, slideIndex) =>
    unit.pictureIndices
      .filter((pictureIndex) => stored.pictures[pictureIndex]?.durationMs === undefined)
      .map(() => durationsMs[slideIndex] as number),
  );
  const ownSeconds =
    (moodSecondsPerPicture !== undefined || stored.pictureLength !== undefined) &&
    automaticMs.length > 0;
  if (ownSeconds && picturesFit) {
    // The mean, rounded down: evenly, the smallest share.
    return { fittedShareMs: Math.floor(sum(automaticMs) / automaticMs.length) };
  }
  const slideshowMs = sum(durationsMs);
  return slideshowMs > musicMs ? { overMs: slideshowMs - musicMs } : {};
}

export function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
