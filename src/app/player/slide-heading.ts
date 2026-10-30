import { isGroundSlide, type Slide } from "../../player";

/** Whether `slide` carries its own title or closing card (ADR-0032): no heading shows over it. */
export function slideCardShows(slide: Slide | undefined): boolean {
  return slide !== undefined && (isGroundSlide(slide) || slide.card !== undefined);
}

/** `slide`'s own capture date; undefined for a ground slide, or when there is no current slide. */
export function slideCaptureDate(slide: Slide | undefined): string | undefined {
  return slide !== undefined && !isGroundSlide(slide) ? slide.image.capturedAt : undefined;
}

/** `slide`'s caption, or an empty string for a ground slide or when there is no current slide. */
export function slideCaptionText(slide: Slide | undefined): string {
  return slide === undefined || isGroundSlide(slide) ? "" : (slide.caption ?? "");
}
