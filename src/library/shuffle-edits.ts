import type { StoredPicture, StoredSlideshow } from "./stored-slideshow";

/**
 * Shuffling the pictures of a stored slideshow into a random order, and taking that back
 * (dev-docs/app/slideshow-editing/REMOVE_SELECT_REORDER.md, Shuffle).
 */

function withPictureOrder(
  slideshow: StoredSlideshow,
  order: readonly string[],
  ownOrder: true | undefined,
): StoredSlideshow {
  const byId = new Map(slideshow.pictures.map((picture) => [picture.id, picture]));
  const pictures = order.map((id) => byId.get(id) as StoredPicture);
  const reordered: { -readonly [K in keyof StoredSlideshow]: StoredSlideshow[K] } = {
    ...slideshow,
    pictures,
  };
  if (ownOrder) {
    reordered.ownOrder = true;
  } else {
    delete reordered.ownOrder;
  }
  return reordered;
}

/** A Fisher–Yates shuffle; an outcome equal to the start is rotated by one so something moves. */
function shuffledIds(order: readonly string[], random: () => number): readonly string[] {
  const shuffled = [...order];
  for (let last = shuffled.length - 1; last > 0; last -= 1) {
    const other = Math.floor(random() * (last + 1));
    [shuffled[last], shuffled[other]] = [shuffled[other] as string, shuffled[last] as string];
  }
  return shuffled.every((id, index) => id === order[index])
    ? [...shuffled.slice(1), shuffled[0] as string]
    : shuffled;
}

/** The pictures in a new random order, which is the user's own; one picture stays as it is. */
export function shuffleSlideshow(
  slideshow: StoredSlideshow,
  random: () => number,
): StoredSlideshow {
  if (slideshow.pictures.length < 2) {
    return slideshow;
  }
  const order = slideshow.pictures.map((picture) => picture.id);
  return withPictureOrder(slideshow, shuffledIds(order, random), true);
}

/**
 * The pictures back in the order of `wantedIds`, with that order's own-order flag (`undefined`: sorted by date). Pictures
 * removed since are skipped; pictures added since follow in their current order.
 */
export function restoreOrder(
  slideshow: StoredSlideshow,
  wantedIds: readonly string[],
  ownOrder: true | undefined,
): StoredSlideshow {
  const present = new Set(slideshow.pictures.map((picture) => picture.id));
  const restored = wantedIds.filter((id) => present.has(id));
  const wanted = new Set(restored);
  const added = slideshow.pictures.map((picture) => picture.id).filter((id) => !wanted.has(id));
  return withPictureOrder(slideshow, [...restored, ...added], ownOrder);
}
