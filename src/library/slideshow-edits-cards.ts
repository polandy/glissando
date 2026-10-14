import { cardWithoutPicture, checkStoredCard, type CardInput } from "./stored-card";
import type { StoredPicture, StoredSlideshow } from "./stored-slideshow";

/**
 * The editing of the slideshow's title slide and closing slide (ADR-0032, TITLE_SLIDES.md): set,
 * update or remove a card; move one off a picture that leaves the slideshow. Pure functions over
 * the stored record; the caller stores the result.
 */

/** Sets the slideshow's title slide; `undefined` removes it. */
export function setOpeningCard(
  slideshow: StoredSlideshow,
  card: CardInput | undefined,
): StoredSlideshow {
  return setCard(slideshow, "openingCard", card);
}

/** Sets the slideshow's closing slide; `undefined` removes it. */
export function setClosingCard(
  slideshow: StoredSlideshow,
  card: CardInput | undefined,
): StoredSlideshow {
  return setCard(slideshow, "closingCard", card);
}

function setCard(
  slideshow: StoredSlideshow,
  key: "openingCard" | "closingCard",
  card: CardInput | undefined,
): StoredSlideshow {
  if (card === undefined) {
    return withoutCard(slideshow, key);
  }
  const pictureIds = new Set(slideshow.pictures.map((picture) => picture.id));
  const checked = checkStoredCard(card, pictureIds, `slideshow "${slideshow.id}".${key}`);
  return key === "openingCard"
    ? { ...slideshow, openingCard: checked }
    : { ...slideshow, closingCard: checked };
}

/** `slideshow` without `key`'s card; each branch deletes a static key (`no-dynamic-delete`). */
function withoutCard(
  slideshow: StoredSlideshow,
  key: "openingCard" | "closingCard",
): StoredSlideshow {
  const next: { -readonly [Key in keyof StoredSlideshow]: StoredSlideshow[Key] } = {
    ...slideshow,
  };
  if (key === "openingCard") {
    delete next.openingCard;
  } else {
    delete next.closingCard;
  }
  return next;
}

/**
 * `slideshow` with `pictures` in place of its own, moving a card whose background picture is one
 * of `removedPictureIds` to the first or last remaining picture, or to the fallback swatch when
 * none is left (TITLE_SLIDES.md).
 */
export function withPicturesAfterCardRemoval(
  slideshow: StoredSlideshow,
  pictures: readonly StoredPicture[],
  removedPictureIds: ReadonlySet<string>,
): StoredSlideshow {
  const openingCard = cardWithoutPicture(slideshow.openingCard, removedPictureIds, pictures[0]?.id);
  const closingCard = cardWithoutPicture(
    slideshow.closingCard,
    removedPictureIds,
    pictures.at(-1)?.id,
  );
  const next: { -readonly [Key in keyof StoredSlideshow]: StoredSlideshow[Key] } = {
    ...slideshow,
    pictures,
  };
  if (openingCard === undefined) {
    delete next.openingCard;
  } else {
    next.openingCard = openingCard;
  }
  if (closingCard === undefined) {
    delete next.closingCard;
  } else {
    next.closingCard = closingCard;
  }
  return next;
}
