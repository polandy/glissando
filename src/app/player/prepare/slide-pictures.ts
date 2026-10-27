import { isGroundSlide, type Slide } from "../../../player/slideshow";

/**
 * The pictures each slide plays in their own place; `ids` are the pictures in order, a slide's
 * `src` is its media id. A ground card owns none, and so does a card over a picture that plays
 * before or after it; a portrait pair owns both of its pictures.
 */
function picturesOwnedBySlide(
  slides: readonly Slide[],
  ids: readonly string[],
): readonly (readonly string[])[] {
  let next = 0;
  return slides.map((slide) => {
    if (isGroundSlide(slide) || slide.image.src !== ids[next]) return [];
    const owned = ids.slice(next, next + (slide.partner === undefined ? 1 : 2));
    next += owned.length;
    return owned;
  });
}

/**
 * The picture each slide passes as it comes on screen, null for none: its first own picture, so
 * a card does not release the renditions before a picture early and a pair's partner stays held.
 */
export function picturePassedBySlide(
  slides: readonly Slide[],
  ids: readonly string[],
): readonly (string | null)[] {
  return picturesOwnedBySlide(slides, ids).map((owned) => owned[0] ?? null);
}

/** The index of the slide that plays `id` in its own place, -1 for none. */
export function slideOfPicture(
  slides: readonly Slide[],
  ids: readonly string[],
  id: string,
): number {
  return picturesOwnedBySlide(slides, ids).findIndex((owned) => owned.includes(id));
}
