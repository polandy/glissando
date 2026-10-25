import type { PictureLength } from "../library/picture-length";
import { MILLISECONDS_PER_SECOND } from "../player/slideshow";
import {
  DEFAULT_WEIGHT,
  MIN_SLIDE_DURATION_MS,
  ownTotalMs,
  type TimedPicture,
} from "./slide-durations-ms";

/**
 * How far a picture may shrink from its own or mood seconds so the slideshow still ends with a
 * shorter music, never below `MIN_SLIDE_DURATION_MS` (ADR-0047): ⅔ keeps a mood recognisable
 * (Calm 7 s → 4.7 s, Lively 3 s → 2 s) where the floor alone would pace every mood the same.
 */
const FIT_SHRINK_FACTOR = 2 / 3;

/**
 * The length the automatic pictures fill, resolved once for "Fill the music" (ADR-0022), own
 * seconds (ADR-0022) and a mood (ADR-0045) alike, now that all three can fit a shorter playlist
 * (ADR-0047):
 *
 * - `targetSecondsPerPicture` absent (fill mode: `pictureLength` absent and no mood) always
 *   returns `playlistLengthMs`, as "Fill the music" does today.
 * - `repeatMusic` `true`, or no playlist, keeps the target: `undefined`, since there is then no
 *   gap to fit or nothing to fit against.
 * - Otherwise, when the automatic pictures at their target would outlast the playlist and
 *   shrinking them (unweighted, after the own durations) to share what is left still leaves at
 *   least `max(MIN_SLIDE_DURATION_MS, FIT_SHRINK_FACTOR × target)` each, `playlistLengthMs` is
 *   returned so they fill it instead, ending the slideshow with the music; a squeeze that would
 *   still fall short keeps the target (`undefined`), since it would still end in silence.
 *
 * Title cards and chapters play on top of this, as they do while filling the music today, so
 * they are not counted here either (`DURATIONS.md`).
 */
export function picturesFillMs(
  playlistLengthMs: number | undefined,
  pictures: readonly TimedPicture[],
  targetSecondsPerPicture: number | undefined,
  repeatMusic: true | undefined,
): number | undefined {
  if (targetSecondsPerPicture === undefined) {
    return playlistLengthMs;
  }
  if (repeatMusic === true || playlistLengthMs === undefined) {
    return undefined;
  }
  const totalWeight = pictures
    .filter((picture) => picture.durationMs === undefined)
    .reduce((sum, picture) => sum + (picture.weight ?? DEFAULT_WEIGHT), 0);
  if (totalWeight === 0) {
    return undefined;
  }
  const targetMs = targetSecondsPerPicture * MILLISECONDS_PER_SECOND;
  const ownMs = ownTotalMs(pictures);
  const outlastsAtTarget = ownMs + totalWeight * targetMs > playlistLengthMs;
  if (!outlastsAtTarget) {
    return undefined;
  }
  const shareMs = (playlistLengthMs - ownMs) / totalWeight;
  const floorMs = Math.max(MIN_SLIDE_DURATION_MS, FIT_SHRINK_FACTOR * targetMs);
  return shareMs >= floorMs ? playlistLengthMs : undefined;
}

/**
 * The seconds per picture a mood or "seconds" picture length would otherwise give every
 * automatic picture — `picturesFillMs`'s `targetSecondsPerPicture`; absent in fill mode, where
 * `picturesFillMs` always returns the playlist's length.
 */
export function targetSecondsPerPicture(
  pictureLength: PictureLength | undefined,
  secondsPerPicture: number,
  moodSecondsPerPicture?: number,
): number | undefined {
  if (moodSecondsPerPicture !== undefined) {
    return moodSecondsPerPicture;
  }
  return pictureLength === undefined ? undefined : secondsPerPicture;
}
