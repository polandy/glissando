import { checkPictureLength, type PictureLength } from "./picture-length";
import { leaveMood } from "./slideshow-edits-mood";
import {
  MAX_SECONDS_PER_PICTURE,
  MIN_SECONDS_PER_PICTURE,
  SECONDS_PER_PICTURE_STEP,
  type StoredSlideshow,
} from "./stored-slideshow";

/**
 * The editing of how long the pictures without an own duration last (ADR-0022). Pure functions
 * over the stored record; the caller stores the result.
 */

/**
 * The pictures last their seconds with music too with `"seconds"`; `undefined` deletes the field,
 * so they fill the music again. While a mood is on, leaves it first (ADR-0045).
 */
export function setPictureLength(
  slideshow: StoredSlideshow,
  pictureLength: PictureLength | undefined,
): StoredSlideshow {
  const filling: { -readonly [Key in keyof StoredSlideshow]: StoredSlideshow[Key] } = {
    ...leaveMood(slideshow),
  };
  delete filling.pictureLength;
  return pictureLength === undefined
    ? filling
    : {
        ...filling,
        pictureLength: checkPictureLength(pictureLength, `slideshow "${slideshow.id}"`),
      };
}

/**
 * Each picture without an own duration stays `seconds`: half-second steps from 2 to 15 s. While
 * a mood is on, leaves it first (ADR-0045).
 */
export function setSecondsPerPicture(slideshow: StoredSlideshow, seconds: number): StoredSlideshow {
  const onStep = Number.isInteger(seconds / SECONDS_PER_PICTURE_STEP);
  if (!onStep || seconds < MIN_SECONDS_PER_PICTURE || seconds > MAX_SECONDS_PER_PICTURE) {
    throw new RangeError(
      `slideshow "${slideshow.id}" secondsPerPicture: expected ${MIN_SECONDS_PER_PICTURE} to ${MAX_SECONDS_PER_PICTURE} in steps of ${SECONDS_PER_PICTURE_STEP}, got ${seconds}`,
    );
  }
  return { ...leaveMood(slideshow), secondsPerPicture: seconds };
}
