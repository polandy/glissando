/**
 * How portrait pictures lay out, set on the slideshow (ADR-0028): absent is automatic, pairs
 * of consecutive portrait pictures and a blurred fill behind a whole picture the crop would
 * otherwise lose too much of; `one-at-a-time` composes no pairs; `fill-screen` composes no pairs
 * and crops every picture, today's layout.
 */

export const ONE_AT_A_TIME_PORTRAIT_PICTURES = "one-at-a-time";
export const FILL_SCREEN_PORTRAIT_PICTURES = "fill-screen";
export const PORTRAIT_PICTURES_CHOICES = [
  ONE_AT_A_TIME_PORTRAIT_PICTURES,
  FILL_SCREEN_PORTRAIT_PICTURES,
] as const;
export type PortraitPictures = (typeof PORTRAIT_PICTURES_CHOICES)[number];

export class InvalidPortraitPicturesError extends Error {
  constructor(
    where: string,
    readonly actual: unknown,
  ) {
    super(
      `${where} portraitPictures: expected one of ${PORTRAIT_PICTURES_CHOICES.join(", ")}, got ${JSON.stringify(actual)}`,
    );
    this.name = "InvalidPortraitPicturesError";
  }
}

/** `value` as a portrait pictures setting; throws `InvalidPortraitPicturesError` naming `where`. */
export function checkPortraitPictures(value: unknown, where: string): PortraitPictures {
  const choice = PORTRAIT_PICTURES_CHOICES.find((candidate) => candidate === value);
  if (choice === undefined) {
    throw new InvalidPortraitPicturesError(where, value);
  }
  return choice;
}
