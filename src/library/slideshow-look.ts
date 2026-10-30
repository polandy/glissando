import { GRADED_SLIDESHOW_LOOKS, type GradedSlideshowLook } from "../player/looks/slideshow-look";

/**
 * The slideshow's colour grade (ADR-0044): one of `GRADED_SLIDESHOW_LOOKS`; absent means None
 * (`DEFAULT_SLIDESHOW_LOOK`), which is never itself a stored value.
 */

export class InvalidSlideshowLookError extends Error {
  constructor(
    where: string,
    readonly actual: unknown,
  ) {
    super(
      `${where} look: expected one of ${GRADED_SLIDESHOW_LOOKS.join(", ")}, got ${JSON.stringify(actual)}`,
    );
    this.name = "InvalidSlideshowLookError";
  }
}

/** `value` as the slideshow's look; throws `InvalidSlideshowLookError` naming `where`. */
export function checkSlideshowLook(value: unknown, where: string): GradedSlideshowLook {
  const look = GRADED_SLIDESHOW_LOOKS.find((candidate) => candidate === value);
  if (look === undefined) {
    throw new InvalidSlideshowLookError(where, value);
  }
  return look;
}
