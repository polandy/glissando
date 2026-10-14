import {
  moveGroup as moveGroupInSlideshow,
  shiftGroup as shiftGroupInSlideshow,
} from "../../library/group-edits";
import {
  removePicture,
  renameSlideshow,
  restorePictures,
  setPictureCaption,
} from "../../library/slideshow-edits";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import type { Toaster } from "../toast/toaster";
import type { AddUndo } from "./add-undo";
import type { RemovalUndo } from "./removal-undo";

/** What `PictureListEditor` needs from the screen to word its toasts. */
export interface PictureListPorts {
  readonly toaster: Pick<Toaster, "show">;
  /** Why the last picture stays, and how to discard the whole slideshow instead. */
  readonly lastPictureText: () => string;
  /** Why removing every picture of a selection is refused instead. */
  readonly everyPictureText: () => string;
  /** The title from the capture dates, which an emptied title falls back to. */
  readonly automaticTitle: (slideshow: StoredSlideshow) => string;
}

/** The undo toasts `PictureListEditor` extends with its own removals and additions. */
export interface PictureListUndos {
  readonly removal: RemovalUndo;
  readonly add: AddUndo;
}

/**
 * The picture list's own shape: which pictures are in, their order, their captions, and the
 * slideshow's title. Removing needs no confirmation; its toast undoes every removal made while
 * it is shown, and any other edit ends that batch, so an undo never puts pictures back at
 * positions that shifted meanwhile.
 */
export class PictureListEditor {
  readonly #ports: PictureListPorts;
  readonly #undos: PictureListUndos;
  readonly #current: () => StoredSlideshow;
  readonly #apply: (slideshow: StoredSlideshow) => void;

  constructor(
    ports: PictureListPorts,
    undos: PictureListUndos,
    current: () => StoredSlideshow,
    apply: (slideshow: StoredSlideshow) => void,
  ) {
    this.#ports = ports;
    this.#undos = undos;
    this.#current = current;
    this.#apply = apply;
  }

  /** The last picture stays; asking to remove it explains why in a toast. */
  remove(pictureId: string): void {
    if (this.#current().pictures.length < 2) {
      this.#ports.toaster.show({ text: this.#ports.lastPictureText(), tone: "info" });
      return;
    }
    this.#removeOne(pictureId);
  }

  /**
   * Removes the whole selection; at least one picture stays, so removing every picture is
   * refused with a toast instead. A single id keeps `remove`'s own text for that case.
   */
  removeGroup(pictureIds: readonly string[]): void {
    if (pictureIds.length === 1) {
      this.remove(pictureIds[0] as string);
      return;
    }
    if (new Set(pictureIds).size >= this.#current().pictures.length) {
      this.#ports.toaster.show({ text: this.#ports.everyPictureText(), tone: "info" });
      return;
    }
    for (const pictureId of pictureIds) {
      this.#removeOne(pictureId);
    }
  }

  /** Pictures just added on the add screen: the toast's undo takes those still here out. */
  offerAddUndo(pictureIds: readonly string[]): void {
    this.#undos.add.offer(pictureIds);
  }

  /** Moves the group contiguous to the slot before the picture at `insertion` (a drop). */
  moveGroup(pictureIds: readonly string[], insertion: number): void {
    const moved = moveGroupInSlideshow(this.#current(), pictureIds, insertion);
    if (moved !== this.#current()) {
      this.#undos.removal.end();
      this.#apply(moved);
    }
  }

  /** Moves the group by `offset` steps (Earlier/Later or Shift+arrows), clamped to the ends. */
  shiftGroup(pictureIds: readonly string[], offset: number): void {
    const shifted = shiftGroupInSlideshow(this.#current(), pictureIds, offset);
    if (shifted !== this.#current()) {
      this.#undos.removal.end();
      this.#apply(shifted);
    }
  }

  rename(typed: string): void {
    const slideshow = this.#current();
    const automatic = this.#ports.automaticTitle(slideshow);
    this.#apply(renameSlideshow(slideshow, typed, automatic));
  }

  /** Stores the caption as typed, normalised; a keystroke that changes nothing stores nothing. */
  setCaption(pictureId: string, typed: string): void {
    const slideshow = this.#current();
    const edited = setPictureCaption(slideshow, pictureId, typed);
    const index = slideshow.pictures.findIndex((picture) => picture.id === pictureId);
    if (edited.pictures[index]?.caption !== this.#picture(pictureId).caption) {
      this.#apply(edited);
    }
  }

  /** Removes one picture at once, adding it to the shown removal batch. */
  #removeOne(pictureId: string): void {
    const slideshow = this.#current();
    const { slideshow: edited, removed } = removePicture(slideshow, pictureId);
    this.#undos.removal.add(removed, (removals) =>
      this.#apply(restorePictures(this.#current(), removals)),
    );
    this.#apply(edited);
  }

  #picture(pictureId: string) {
    const picture = this.#current().pictures.find((candidate) => candidate.id === pictureId);
    if (picture === undefined) {
      throw new Error(`slideshow "${this.#current().id}" holds no picture "${pictureId}"`);
    }
    return picture;
  }
}
