import { MIN_SECONDS_PER_PICTURE } from "../library/stored-slideshow";

const MILLISECONDS_PER_SECOND = 1000;
const MIN_SLIDE_DURATION_MS = MIN_SECONDS_PER_PICTURE * MILLISECONDS_PER_SECOND;

/**
 * The slide durations the automatic choice picks: with music, the track's length split evenly
 * (the remainder going to the first slides so the sum matches exactly); without music, a fixed
 * duration per picture. A split below `MIN_SECONDS_PER_PICTURE` is rejected in favour of the
 * minimum, so the slideshow outlasts a music track too short for the picture count.
 */
export function slideDurationsMs(
  pictureCount: number,
  musicDurationMs: number | undefined,
  secondsPerPicture: number,
): number[] {
  if (pictureCount < 1) {
    throw new RangeError(`pictureCount: expected at least 1, got ${pictureCount}`);
  }
  if (musicDurationMs === undefined) {
    return Array<number>(pictureCount).fill(secondsPerPicture * MILLISECONDS_PER_SECOND);
  }

  const evenShare = Math.floor(musicDurationMs / pictureCount);
  if (evenShare < MIN_SLIDE_DURATION_MS) {
    return Array<number>(pictureCount).fill(MIN_SLIDE_DURATION_MS);
  }

  const remainderMs = musicDurationMs - evenShare * pictureCount;
  return Array.from({ length: pictureCount }, (_, index) =>
    index < remainderMs ? evenShare + 1 : evenShare,
  );
}
