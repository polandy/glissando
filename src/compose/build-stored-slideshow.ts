import type { StoredMusic, StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import { orderByCaptureDate } from "./order-by-capture-date";
import { titleForCaptureRange } from "./title-for-capture-range";

export interface BuildStoredSlideshowInput {
  readonly id: string;
  /** ISO 8601 date-time. */
  readonly createdAt: string;
  readonly pictures: readonly StoredPicture[];
  readonly music?: StoredMusic;
  readonly secondsPerPicture: number;
  /** Locale the title's month name is written in. */
  readonly locale: string;
}

/** Applies the automatic choices an import makes: capture order and a title from the range. */
export function buildStoredSlideshow(input: BuildStoredSlideshowInput): StoredSlideshow {
  const pictures = orderByCaptureDate(input.pictures);
  const title = titleForCaptureRange(
    pictures.map((picture) => picture.capturedAt),
    input.locale,
  );

  const base = {
    id: input.id,
    title,
    createdAt: input.createdAt,
    pictures,
    secondsPerPicture: input.secondsPerPicture,
  };
  return input.music === undefined ? base : { ...base, music: input.music };
}
