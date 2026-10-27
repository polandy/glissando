import { isGroundSlide, type Slide } from "../../../player/slideshow";

/**
 * The picture each slide passes as it comes on screen, null for none; `ids` are the pictures in
 * order, a slide's `src` is its media id. A slide passes its picture only in that picture's own
 * place: a ground card passes none, and so does a card over a picture that plays before or after
 * it, so the renditions before that picture are not released early. A portrait pair passes its
 * first picture; its partner stays held.
 */
export function picturePassedBySlide(
  slides: readonly Slide[],
  ids: readonly string[],
): readonly (string | null)[] {
  let next = 0;
  return slides.map((slide) => {
    if (isGroundSlide(slide) || slide.image.src !== ids[next]) return null;
    const picture = slide.image.src;
    next += slide.partner === undefined ? 1 : 2;
    return picture;
  });
}
