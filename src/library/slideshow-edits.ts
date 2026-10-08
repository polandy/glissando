import type { StoredPicture, StoredSlideshow } from "./stored-slideshow";

/**
 * The minimal editing of a slideshow (dev-docs/SCOPE.md): remove, reorder, rename. Pure
 * functions over the stored record; the caller stores the result.
 */

export const MAX_TITLE_LENGTH = 80;

/** A removed picture and the position it held, so an undo puts it back there. */
export interface RemovedPicture {
  readonly picture: StoredPicture;
  readonly index: number;
}

/** A slideshow keeps at least one picture; to get rid of it, the whole slideshow is deleted. */
export class LastPictureError extends Error {
  constructor(readonly slideshowId: string) {
    super(`slideshow "${slideshowId}" has one picture left, which cannot be removed`);
    this.name = "LastPictureError";
  }
}

function indexOf(slideshow: StoredSlideshow, pictureId: string): number {
  const index = slideshow.pictures.findIndex((picture) => picture.id === pictureId);
  if (index < 0) {
    throw new Error(`slideshow "${slideshow.id}" holds no picture "${pictureId}"`);
  }
  return index;
}

export function removePicture(
  slideshow: StoredSlideshow,
  pictureId: string,
): { readonly slideshow: StoredSlideshow; readonly removed: RemovedPicture } {
  const index = indexOf(slideshow, pictureId);
  if (slideshow.pictures.length === 1) {
    throw new LastPictureError(slideshow.id);
  }
  const pictures = slideshow.pictures.filter((_, at) => at !== index);
  const picture = slideshow.pictures[index] as StoredPicture;
  return { slideshow: { ...slideshow, pictures }, removed: { picture, index } };
}

/** Undoes removals given in the order they happened: the latest goes back first. */
export function restorePictures(
  slideshow: StoredSlideshow,
  removals: readonly RemovedPicture[],
): StoredSlideshow {
  const pictures = [...slideshow.pictures];
  for (const { picture, index } of [...removals].reverse()) {
    pictures.splice(index, 0, picture);
  }
  return { ...slideshow, pictures };
}

/** Moves a picture to `toIndex` in play order; any move makes the order the user's own. */
export function movePicture(
  slideshow: StoredSlideshow,
  pictureId: string,
  toIndex: number,
): StoredSlideshow {
  const fromIndex = indexOf(slideshow, pictureId);
  if (!Number.isInteger(toIndex) || toIndex < 0 || toIndex >= slideshow.pictures.length) {
    throw new RangeError(
      `toIndex: expected 0 to ${slideshow.pictures.length - 1} for slideshow "${slideshow.id}", got ${toIndex}`,
    );
  }
  if (toIndex === fromIndex) {
    return slideshow;
  }
  const pictures = slideshow.pictures.filter((_, at) => at !== fromIndex);
  pictures.splice(toIndex, 0, slideshow.pictures[fromIndex] as StoredPicture);
  return { ...slideshow, pictures, ownOrder: true };
}

/** An empty title means "no title of my own": the automatic one from the capture dates. */
export function renameSlideshow(
  slideshow: StoredSlideshow,
  typed: string,
  automaticTitle: string,
): StoredSlideshow {
  const title = typed.trim().slice(0, MAX_TITLE_LENGTH).trim();
  return { ...slideshow, title: title === "" ? automaticTitle : title };
}
