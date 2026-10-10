import { orderWithGroupAt, orderWithGroupShifted } from "./group-order";
import type { StoredPicture, StoredSlideshow } from "./stored-slideshow";

/**
 * Moving several pictures together in a stored slideshow (dev-docs/APP.md, Select and reorder;
 * ADR-0019): the pure order logic is in `group-order.ts`, applied here to the stored pictures.
 */

function withOrder(
  slideshow: StoredSlideshow,
  order: readonly string[],
  newOrder: readonly string[],
): StoredSlideshow {
  if (newOrder === order) {
    return slideshow;
  }
  const byId = new Map(slideshow.pictures.map((picture) => [picture.id, picture]));
  const pictures = newOrder.map((id) => byId.get(id) as StoredPicture);
  return { ...slideshow, pictures, ownOrder: true };
}

/**
 * Moves `pictureIds` contiguous to the slot before the picture currently at `insertion`
 * (`orderWithGroupAt`); any move makes the order the user's own.
 */
export function moveGroup(
  slideshow: StoredSlideshow,
  pictureIds: readonly string[],
  insertion: number,
): StoredSlideshow {
  const order = slideshow.pictures.map((picture) => picture.id);
  return withOrder(slideshow, order, orderWithGroupAt(order, new Set(pictureIds), insertion));
}

/**
 * Moves `pictureIds` by `offset` steps, gathering a scattered group first (`orderWithGroupShifted`);
 * any move makes the order the user's own.
 */
export function shiftGroup(
  slideshow: StoredSlideshow,
  pictureIds: readonly string[],
  offset: number,
): StoredSlideshow {
  const order = slideshow.pictures.map((picture) => picture.id);
  return withOrder(slideshow, order, orderWithGroupShifted(order, new Set(pictureIds), offset));
}
