import type { PictureLength } from "../library/picture-length";
import type { StoredMusic, StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import { orderByCaptureDate } from "./order-by-capture-date";
import { titleForCaptureRange } from "./title-for-capture-range";

export interface BuildStoredSlideshowInput {
  readonly id: string;
  /** ISO 8601 date-time. */
  readonly createdAt: string;
  readonly pictures: readonly StoredPicture[];
  /** The pictures' ids in this exact order; absent: capture order, ties by file name. */
  readonly order?: readonly string[];
  /** The `order` given is the user's own (IMPORT_ARRANGING.md, Order); ignored without `order`. */
  readonly ownOrder?: true;
  /** The playlist, in play order; empty without music. */
  readonly songs: readonly StoredMusic[];
  readonly secondsPerPicture: number;
  /** Absent: the pictures fill the music (ADR-0022). */
  readonly pictureLength?: PictureLength;
  /** Locale the title's month name is written in. */
  readonly locale: string;
}

function orderedById(
  pictures: readonly StoredPicture[],
  order: readonly string[],
): readonly StoredPicture[] {
  const byId = new Map(pictures.map((picture) => [picture.id, picture]));
  return order.map((id) => byId.get(id) as StoredPicture);
}

/**
 * Applies the automatic choices an import makes: a title from the capture range, and, without an
 * explicit `order`, capture order.
 */
export function buildStoredSlideshow(input: BuildStoredSlideshowInput): StoredSlideshow {
  const pictures =
    input.order === undefined
      ? orderByCaptureDate(input.pictures)
      : orderedById(input.pictures, input.order);
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
    ...(input.order !== undefined && input.ownOrder ? { ownOrder: true } : {}),
  };
}
