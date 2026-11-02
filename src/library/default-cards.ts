import { dayRangeForCaptureRange } from "../compose/day-range-for-capture-range";
import { titleForCaptureRange } from "../compose/title-for-capture-range";
import { DEFAULT_CARD_FADE, DEFAULT_CARD_TINT, FALLBACK_CARD_SWATCH } from "./stored-card";
import type { StoredCard, StoredCardBackground, StoredSlideshow } from "./stored-slideshow";

/**
 * The title slide a sheet opens with for a slideshow that has none: the slideshow's title, an
 * empty subtitle while that title is still the automatic month title, otherwise the capture day
 * range, reveal on, over the first picture.
 */
export function defaultOpeningCard(slideshow: StoredSlideshow, locale: string): StoredCard {
  const firstPicture = slideshow.pictures[0];
  if (firstPicture === undefined) {
    throw new RangeError(`slideshow "${slideshow.id}" has no pictures`);
  }
  const capturedAt = slideshow.pictures.map((picture) => picture.capturedAt);
  const automaticTitle = titleForCaptureRange(capturedAt, locale);
  const dayRange = dayRangeForCaptureRange(capturedAt, locale);
  const subtitle =
    slideshow.title === automaticTitle || slideshow.title === dayRange ? "" : dayRange;
  return {
    title: slideshow.title,
    subtitle,
    style: "modern",
    position: "centre",
    entrance: "rise",
    background: {
      kind: "picture",
      pictureId: firstPicture.id,
      fade: DEFAULT_CARD_FADE,
      tint: DEFAULT_CARD_TINT,
    },
    motion: true,
  };
}

/**
 * The closing slide a sheet opens with for a slideshow that has none: an empty title, fade in on,
 * over the last picture.
 */
export function defaultClosingCard(slideshow: StoredSlideshow): StoredCard {
  const lastPicture = slideshow.pictures.at(-1);
  if (lastPicture === undefined) {
    throw new RangeError(`slideshow "${slideshow.id}" has no pictures`);
  }
  return {
    title: "",
    style: "modern",
    position: "centre",
    entrance: "rise",
    background: {
      kind: "picture",
      pictureId: lastPicture.id,
      fade: DEFAULT_CARD_FADE,
      tint: DEFAULT_CARD_TINT,
    },
    motion: true,
  };
}

/**
 * `card` once every picture in `removedPictureIds` leaves the slideshow: unchanged unless one of
 * them is its background's picture, in which case it moves to `fallbackPictureId` (the first
 * remaining picture for the opening card, the last for the closing card) or to the fallback
 * swatch when no picture is left.
 */
export function cardWithoutPicture(
  card: StoredCard | undefined,
  removedPictureIds: ReadonlySet<string>,
  fallbackPictureId: string | undefined,
): StoredCard | undefined {
  if (card === undefined || card.background.kind !== "picture") {
    return card;
  }
  if (!removedPictureIds.has(card.background.pictureId)) {
    return card;
  }
  const background: StoredCardBackground =
    fallbackPictureId === undefined
      ? { kind: "colour", colour: FALLBACK_CARD_SWATCH }
      : {
          kind: "picture",
          pictureId: fallbackPictureId,
          fade: card.background.fade,
          tint: card.background.tint,
        };
  return { ...card, background };
}
