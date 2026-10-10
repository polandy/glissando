import { orderByCaptureDate } from "../compose/order-by-capture-date";
import { placeByCaptureDate, type AddedPlacement } from "./added-placement";
import { normalizeCaption } from "../player/caption";
import { checkOwnKenBurns, type OwnKenBurns } from "./own-ken-burns";
import { checkMusicFadeMs, checkMusicTrim, type MusicTrim } from "./own-music";
import {
  DEFAULT_SLIDESHOW_TRANSITION,
  checkOwnDurationMs,
  checkSlideshowTransition,
  checkTransitionChoice,
  type SlideshowTransition,
  type TransitionChoice,
} from "./own-timing";
import type { StoredMusic, StoredPicture, StoredSlideshow } from "./stored-slideshow";

/**
 * The editing of a slideshow (dev-docs/SCOPE.md): add, remove, reorder, rename, a picture's own Ken
 * Burns motion, duration and transition, its caption, and the music's excerpt and fades. Pure
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

/**
 * New pictures go into their places by capture date while the slideshow keeps that order. Once
 * the order is the user's own, which stays, `placement` decides: sorted in by capture date
 * (`placeByCaptureDate`) or at the end in capture order. A picture whose id is already in the
 * slideshow is skipped, so an add applied twice adds once.
 */
export function addPictures(
  slideshow: StoredSlideshow,
  added: readonly StoredPicture[],
  placement: AddedPlacement,
): StoredSlideshow {
  const present = new Set(slideshow.pictures.map(({ id }) => id));
  const fresh = added.filter(({ id }) => !present.has(id));
  const intoOwnOrder =
    placement === "byCaptureDate"
      ? placeByCaptureDate(slideshow.pictures, fresh)
      : [...slideshow.pictures, ...orderByCaptureDate(fresh)];
  const pictures = slideshow.ownOrder
    ? intoOwnOrder
    : orderByCaptureDate([...slideshow.pictures, ...fresh]);
  return { ...slideshow, pictures };
}

/** Undoes an adding: the given pictures still in the slideshow leave it; one always stays. */
export function takeOutPictures(
  slideshow: StoredSlideshow,
  pictureIds: readonly string[],
): StoredSlideshow {
  const taken = new Set(pictureIds);
  const pictures = slideshow.pictures.filter((picture) => !taken.has(picture.id));
  if (pictures.length === 0) {
    throw new LastPictureError(slideshow.id);
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

/**
 * Sets the slideshow's default transition; `undefined` or the crossfade deletes the field, since
 * its absence is the crossfade (ADR-0010). The pictures' own transitions stay as they are.
 */
export function setSlideshowTransition(
  slideshow: StoredSlideshow,
  transition: SlideshowTransition | undefined,
): StoredSlideshow {
  const withoutTransition: { -readonly [Key in keyof StoredSlideshow]: StoredSlideshow[Key] } = {
    ...slideshow,
  };
  delete withoutTransition.transition;
  if (transition === undefined) {
    return withoutTransition;
  }
  const checked = checkSlideshowTransition(transition, `slideshow "${slideshow.id}"`);
  return checked === DEFAULT_SLIDESHOW_TRANSITION
    ? withoutTransition
    : { ...withoutTransition, transition: checked };
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

/** Plays only `trim` of the music; `undefined` or the whole track deletes the field (ADR-0009). */
export function setMusicTrim(
  slideshow: StoredSlideshow,
  trim: MusicTrim | undefined,
): StoredSlideshow {
  return editMusic(slideshow, (music) => {
    delete music.trim;
    if (trim === undefined) {
      return music;
    }
    const checked = checkMusicTrim(trim, music.durationMs, `slideshow "${slideshow.id}" music`);
    const wholeTrack = checked.startMs === 0 && checked.endMs === music.durationMs;
    return wholeTrack ? music : { ...music, trim: checked };
  });
}

/** Gives the music its own fade-in in ms, 0 being off; `undefined` makes it automatic again. */
export function setMusicFadeIn(
  slideshow: StoredSlideshow,
  fadeInMs: number | undefined,
): StoredSlideshow {
  return editMusic(slideshow, (music) => {
    delete music.fadeInMs;
    return fadeInMs === undefined
      ? music
      : {
          ...music,
          fadeInMs: checkMusicFadeMs(fadeInMs, "fadeInMs", `slideshow "${slideshow.id}" music`),
        };
  });
}

/** Gives the music its own fade-out in ms, 0 being off; `undefined` makes it automatic again. */
export function setMusicFadeOut(
  slideshow: StoredSlideshow,
  fadeOutMs: number | undefined,
): StoredSlideshow {
  return editMusic(slideshow, (music) => {
    delete music.fadeOutMs;
    return fadeOutMs === undefined
      ? music
      : {
          ...music,
          fadeOutMs: checkMusicFadeMs(fadeOutMs, "fadeOutMs", `slideshow "${slideshow.id}" music`),
        };
  });
}

/** `edit` receives a mutable copy of the music; throws when the slideshow has none. */
function editMusic(
  slideshow: StoredSlideshow,
  edit: (music: { -readonly [Key in keyof StoredMusic]: StoredMusic[Key] }) => StoredMusic,
): StoredSlideshow {
  if (slideshow.music === undefined) {
    throw new Error(`slideshow "${slideshow.id}" has no music to edit`);
  }
  return { ...slideshow, music: edit({ ...slideshow.music }) };
}
