/**
 * How long the pictures without an own duration last when the slideshow has music (ADR-0022):
 * their `secondsPerPicture` each, the slideshow then lasting as long as its pictures, or (the
 * field absent) sharing the music's excerpt so that the slideshow ends with it.
 */

/** The pictures last their seconds even with music; absent: they fill the music. */
export const OWN_SECONDS_PICTURE_LENGTH = "seconds";
export type PictureLength = typeof OWN_SECONDS_PICTURE_LENGTH;

export class InvalidPictureLengthError extends Error {
  constructor(
    where: string,
    readonly actual: unknown,
  ) {
    super(
      `${where} pictureLength: expected ${JSON.stringify(OWN_SECONDS_PICTURE_LENGTH)}, got ${JSON.stringify(actual)}`,
    );
    this.name = "InvalidPictureLengthError";
  }
}

/** `value` as a picture length; throws `InvalidPictureLengthError` naming `where`. */
export function checkPictureLength(value: unknown, where: string): PictureLength {
  if (value !== OWN_SECONDS_PICTURE_LENGTH) {
    throw new InvalidPictureLengthError(where, value);
  }
  return value;
}
