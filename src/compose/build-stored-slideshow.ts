import type { PictureLength } from "../library/picture-length";
import type { StoredMusic, StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import { orderByCaptureDate } from "./order-by-capture-date";
import { titleForCaptureRange } from "./title-for-capture-range";

export interface BuildStoredSlideshowInput {
  readonly id: string;
  /** ISO 8601 date-time. */
  readonly createdAt: string;
  readonly pictures: readonly StoredPicture[];
  /** The playlist, in play order; empty without music. */
  readonly songs: readonly StoredMusic[];
  readonly secondsPerPicture: number;
  /** Absent: the pictures fill the music (ADR-0022). */
  readonly pictureLength?: PictureLength;
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

  return {
    id: input.id,
    title,
    createdAt: input.createdAt,
    pictures,
    songs: input.songs,
    secondsPerPicture: input.secondsPerPicture,
    ...(input.pictureLength === undefined ? {} : { pictureLength: input.pictureLength }),
  };
}
