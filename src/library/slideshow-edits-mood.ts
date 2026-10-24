import { MOOD_PROFILES } from "../compose/mood-settings";
import { DEFAULT_SLIDESHOW_TRANSITION } from "./own-timing";
import { OWN_SECONDS_PICTURE_LENGTH } from "./picture-length";
import { checkSlideshowMood, type SlideshowMood } from "./slideshow-mood";
import type { StoredSlideshow } from "./stored-slideshow";

/**
 * The editing of the slideshow's mood (ADR-0045, `dev-docs/app/slideshow-editing/MOOD.md`). Pure
 * functions over the stored record; the caller stores the result.
 */

/**
 * Sets the slideshow's mood; `undefined` deletes the field, back to Custom (ADR-0045). The
 * single settings stay stored untouched, so Custom brings them back as they were.
 */
export function setSlideshowMood(
  slideshow: StoredSlideshow,
  mood: SlideshowMood | undefined,
): StoredSlideshow {
  const withoutMood: { -readonly [Key in keyof StoredSlideshow]: StoredSlideshow[Key] } = {
    ...slideshow,
  };
  delete withoutMood.mood;
  if (mood === undefined) {
    return withoutMood;
  }
  const checked = checkSlideshowMood(mood, `slideshow "${slideshow.id}"`);
  return { ...withoutMood, mood: checked };
}

/**
 * Switches the slideshow to Custom, writing the mood's own transition, picture length and
 * target seconds into the single settings first, so changing one of them afterwards starts from
 * what the mood was showing (ADR-0045). Without a mood, returns the slideshow unchanged. The
 * mood's own values need no re-checking: they come from `MOOD_PROFILES`, not from the user.
 */
export function leaveMood(slideshow: StoredSlideshow): StoredSlideshow {
  if (slideshow.mood === undefined) {
    return slideshow;
  }
  const profile = MOOD_PROFILES[slideshow.mood];
  const left: { -readonly [Key in keyof StoredSlideshow]: StoredSlideshow[Key] } = {
    ...slideshow,
    pictureLength: OWN_SECONDS_PICTURE_LENGTH,
    secondsPerPicture: profile.targetSeconds,
  };
  delete left.mood;
  if (profile.transition === DEFAULT_SLIDESHOW_TRANSITION) {
    delete left.transition;
  } else {
    left.transition = profile.transition;
  }
  return left;
}
