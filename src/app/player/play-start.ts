import type { Slideshow } from "../../player/slideshow";
import { slideBoundaries } from "./slide-boundaries";
import { slideOfPicture } from "./prepare/slide-pictures";

/** Where a show opens: the slide, and its start on the time line in seconds. */
export interface PlayStart {
  readonly slide: number;
  readonly seconds: number;
}

export const FROM_THE_START: PlayStart = { slide: 0, seconds: 0 };

/**
 * Where playing from `pictureId` begins: the start of the slide that plays it — a pair's slide
 * for either of its pictures. From the start for no picture and for one not played.
 */
export function playStart(
  slideshow: Pick<Slideshow, "slides">,
  ids: readonly string[],
  pictureId: string | null,
): PlayStart {
  if (pictureId === null) return FROM_THE_START;
  const slide = slideOfPicture(slideshow.slides, ids, pictureId);
  const seconds = slideBoundaries(slideshow).starts[slide];
  return seconds === undefined ? FROM_THE_START : { slide, seconds };
}
