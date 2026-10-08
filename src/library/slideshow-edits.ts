import { normalizeCaption } from "../player/caption";
import { checkOwnKenBurns, type OwnKenBurns } from "./own-ken-burns";
import { checkOwnDurationMs, checkTransitionChoice, type TransitionChoice } from "./own-timing";
import type { StoredPicture, StoredSlideshow } from "./stored-slideshow";

/**
 * The editing of a slideshow (dev-docs/SCOPE.md): remove, reorder, rename, a picture's own
 * Ken Burns motion, duration and transition, and its caption. Pure functions over the stored record; the caller stores the
 * result.
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

/** Gives the picture its own motion; `undefined` makes it automatic again. */
export function setPictureKenBurns(
  slideshow: StoredSlideshow,
  pictureId: string,
  kenBurns: OwnKenBurns | undefined,
): StoredSlideshow {
  return editPicture(slideshow, pictureId, (picture) => {
    delete picture.kenBurns;
    return kenBurns === undefined
      ? picture
      : { ...picture, kenBurns: checkOwnKenBurns(kenBurns, `picture "${pictureId}"`) };
  });
}

/** Stores the caption as `normalizeCaption` leaves `typed`; nothing left removes it. */
export function setPictureCaption(
  slideshow: StoredSlideshow,
  pictureId: string,
  typed: string,
): StoredSlideshow {
  const caption = normalizeCaption(typed);
  return editPicture(slideshow, pictureId, (picture) => {
    delete picture.caption;
    return caption === undefined ? picture : { ...picture, caption };
  });
}

/** Gives the picture its own duration in ms; `undefined` makes it automatic again. */
export function setPictureDuration(
  slideshow: StoredSlideshow,
  pictureId: string,
  durationMs: number | undefined,
): StoredSlideshow {
  return editPicture(slideshow, pictureId, (picture) => {
    delete picture.durationMs;
    return durationMs === undefined
      ? picture
      : { ...picture, durationMs: checkOwnDurationMs(durationMs, `picture "${pictureId}"`) };
  });
}

/** Gives the picture its own transition to the next; `undefined` makes it automatic again. */
export function setPictureTransition(
  slideshow: StoredSlideshow,
  pictureId: string,
  transition: TransitionChoice | undefined,
): StoredSlideshow {
  return editPicture(slideshow, pictureId, (picture) => {
    delete picture.transition;
    return transition === undefined
      ? picture
      : { ...picture, transition: checkTransitionChoice(transition, `picture "${pictureId}"`) };
  });
}

/** `edit` receives a mutable copy of the picture. */
function editPicture(
  slideshow: StoredSlideshow,
  pictureId: string,
  edit: (picture: { -readonly [Key in keyof StoredPicture]: StoredPicture[Key] }) => StoredPicture,
): StoredSlideshow {
  const index = indexOf(slideshow, pictureId);
  const edited = edit({ ...(slideshow.pictures[index] as StoredPicture) });
  const pictures = slideshow.pictures.map((other, at) => (at === index ? edited : other));
  return { ...slideshow, pictures };
}
