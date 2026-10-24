/**
 * A slideshow's mood (ADR-0045, `dev-docs/app/slideshow-editing/MOOD.md`): a live rule that paces
 * the picture times, the default transition and the Ken Burns strength from the music's tempo.
 * Custom, the default, is no entry here — its absence from `StoredSlideshow.mood` means it.
 */
export const SLIDESHOW_MOODS = ["calm", "lively"] as const;
export type SlideshowMood = (typeof SLIDESHOW_MOODS)[number];

export class InvalidSlideshowMoodError extends Error {
  constructor(
    where: string,
    readonly actual: unknown,
  ) {
    super(
      `${where} mood: expected one of ${SLIDESHOW_MOODS.join(", ")}, got ${JSON.stringify(actual)}`,
    );
    this.name = "InvalidSlideshowMoodError";
  }
}

/** `value` as the slideshow's mood; throws `InvalidSlideshowMoodError` naming `where`. */
export function checkSlideshowMood(value: unknown, where: string): SlideshowMood {
  const mood = SLIDESHOW_MOODS.find((candidate) => candidate === value);
  if (mood === undefined) {
    throw new InvalidSlideshowMoodError(where, value);
  }
  return mood;
}
