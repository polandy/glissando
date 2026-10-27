import { OWN_SECONDS_PICTURE_LENGTH, type PictureLength } from "../library/picture-length";
import type { SlideshowMood } from "../library/slideshow-mood";
import {
  DEFAULT_SECONDS_PER_PICTURE,
  type StoredMusic,
  type StoredPicture,
  type StoredSlideshow,
} from "../library/stored-slideshow";
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
  /** The music repeats from its first song for as long as the slideshow lasts (ADR-0047). */
  readonly repeatMusic?: true;
  /** Locale the title's month name is written in. */
  readonly locale: string;
}

function orderedById(
  pictures: readonly StoredPicture[],
  order: readonly string[],
): readonly StoredPicture[] {
  const byId = new Map(pictures.map((picture) => [picture.id, picture]));
  if (new Set(order).size !== byId.size) {
    throw new Error(
      `the slideshow's order names ${new Set(order).size} pictures, but it has ${byId.size}`,
    );
  }
  return order.map((id) => {
    const picture = byId.get(id);
    if (picture === undefined) {
      throw new Error(`the slideshow's order names a picture "${id}" it does not have`);
    }
    return picture;
  });
}

/** The mood a new slideshow starts on while the import left the pace as it was (ADR-0049). */
const NEW_SLIDESHOW_MOOD: SlideshowMood = "calm";

function setsOwnPace(input: BuildStoredSlideshowInput): boolean {
  return (
    input.secondsPerPicture !== DEFAULT_SECONDS_PER_PICTURE ||
    input.pictureLength !== OWN_SECONDS_PICTURE_LENGTH
  );
}

/**
 * Applies the automatic choices an import makes: a title from the capture range, without an
 * explicit `order` capture order, and the mood Calm unless the import set the pace (ADR-0049).
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
    ...(input.repeatMusic === undefined ? {} : { repeatMusic: input.repeatMusic }),
    ...(setsOwnPace(input) ? {} : { mood: NEW_SLIDESHOW_MOOD }),
  };
}
