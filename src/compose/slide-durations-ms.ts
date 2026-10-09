import { MIN_SECONDS_PER_PICTURE, type StoredPicture } from "../library/stored-slideshow";
import { MILLISECONDS_PER_SECOND } from "../player/slideshow";

const MIN_SLIDE_DURATION_MS = MIN_SECONDS_PER_PICTURE * MILLISECONDS_PER_SECOND;

/** What the durations are computed from: a picture's own duration, if it has one. */
export type TimedPicture = Pick<StoredPicture, "durationMs">;

/**
 * The slide durations in play order. An own duration is kept exactly. Without music the other
 * pictures show `secondsPerPicture` each; with music they share the rest of the track evenly (the
 * remainder going to the first of them so the sum matches exactly). A share below
 * `MIN_SECONDS_PER_PICTURE` is rejected in favour of the minimum, so the slideshow outlasts a
 * track too short for it. See ADR-0008.
 */
export function slideDurationsMs(
  pictures: readonly TimedPicture[],
  musicDurationMs: number | undefined,
  secondsPerPicture: number,
): number[] {
  if (pictures.length < 1) {
    throw new RangeError(`pictures: expected at least 1, got ${pictures.length}`);
  }
  const automaticCount = pictures.filter((picture) => picture.durationMs === undefined).length;
  const automaticMs =
    musicDurationMs === undefined
      ? Array<number>(automaticCount).fill(secondsPerPicture * MILLISECONDS_PER_SECOND)
      : evenSplitMs(automaticCount, musicDurationMs - ownTotalMs(pictures));
  let nextAutomatic = 0;
  // automaticMs holds exactly one entry per picture without an own duration.
  return pictures.map((picture) => picture.durationMs ?? (automaticMs[nextAutomatic++] as number));
}

function ownTotalMs(pictures: readonly TimedPicture[]): number {
  return pictures.reduce((sum, picture) => sum + (picture.durationMs ?? 0), 0);
}

/** `restMs` in `count` even shares, the remainder on the first; the minimum if a share falls below. */
function evenSplitMs(count: number, restMs: number): number[] {
  if (count === 0) {
    return [];
  }
  const evenShare = Math.floor(restMs / count);
  if (evenShare < MIN_SLIDE_DURATION_MS) {
    return Array<number>(count).fill(MIN_SLIDE_DURATION_MS);
  }
  const remainderMs = restMs - evenShare * count;
  return Array.from({ length: count }, (_, index) =>
    index < remainderMs ? evenShare + 1 : evenShare,
  );
}
