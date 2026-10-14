import { isGroundSlide, type PictureSlide, type Slide } from "../slideshow";

/** Narrows a slide a test knows, by construction, holds a picture rather than a ground colour. */
export function pictureSlide(slide: Slide | undefined): PictureSlide {
  if (slide === undefined || isGroundSlide(slide)) {
    throw new Error("expected a picture slide");
  }
  return slide;
}
