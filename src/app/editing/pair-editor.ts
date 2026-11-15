import { pictureLayoutSummaries, type PictureLayoutSummary } from "../../compose";
import { setPictureAlone } from "../../library/slideshow-edits";
import type { StoredPicture, StoredSlideshow } from "../../library/stored-slideshow";
import type { ResetUndo } from "./reset-undo";

/** What `PairEditor` words its undo toasts with; numbers are the pictures' 1-based positions. */
export interface PairPorts {
  /** The undo toast's text after the pair `first` and `second` was split. */
  readonly pairSplitText: (first: number, second: number) => string;
  /** The undo toast's text after `first` and `second` were made a pair again. */
  readonly pairRejoinedText: (first: number, second: number) => string;
}

/**
 * A picture's "alone" mark (ADR-0028), set by the picture editor's switch or by splitting a pair
 * in the strip. A split marks the pair's second picture: pairing runs greedily from the start, so
 * no other pair changes. Split and rejoin ask nothing; their toast's undo reverses them.
 */
export class PairEditor {
  readonly #ports: PairPorts;
  readonly #reset: ResetUndo;
  readonly #current: () => StoredSlideshow;
  readonly #apply: (slideshow: StoredSlideshow) => void;

  constructor(
    ports: PairPorts,
    reset: ResetUndo,
    current: () => StoredSlideshow,
    apply: (slideshow: StoredSlideshow) => void,
  ) {
    this.#ports = ports;
    this.#reset = reset;
    this.#current = current;
    this.#apply = apply;
  }

  /** The picture editor's switch; it ends a pending split or rejoin undo of that picture. */
  setAlone(pictureId: string, alone: boolean): void {
    this.#reset.supersede(pictureId, "alone");
    this.#apply(setPictureAlone(this.#current(), pictureId, alone));
  }

  /** Splits the pair `pictureId` belongs to; a picture that shares no slide changes nothing. */
  split(pictureId: string): void {
    const slideshow = this.#current();
    const index = this.#indexOf(pictureId);
    const partnerNumber = this.#summaryAt(index).pairedWithNumber;
    if (partnerNumber === null) {
      return;
    }
    const [first, second] = ordered(index + 1, partnerNumber);
    const secondId = (slideshow.pictures[second - 1] as StoredPicture).id;
    this.#apply(setPictureAlone(slideshow, secondId, true));
    this.#offerUndo(secondId, this.#ports.pairSplitText(first, second), false);
  }

  /** Clears the mark of an alone picture that then pairs again; any other changes nothing. */
  rejoin(pictureId: string): void {
    const index = this.#indexOf(pictureId);
    const partnerNumber = this.#summaryAt(index).rejoinsWithNumber;
    if (partnerNumber === null) {
      return;
    }
    const [first, second] = ordered(index + 1, partnerNumber);
    this.#apply(setPictureAlone(this.#current(), pictureId, false));
    this.#offerUndo(pictureId, this.#ports.pairRejoinedText(first, second), true);
  }

  /** The undo restores the mark as it was; a picture removed meanwhile has nothing to restore. */
  #offerUndo(pictureId: string, text: string, alone: boolean): void {
    this.#reset.offer(pictureId, "alone", text, () => {
      if (this.#current().pictures.some((picture) => picture.id === pictureId)) {
        this.#apply(setPictureAlone(this.#current(), pictureId, alone));
      }
    });
  }

  #summaryAt(index: number): PictureLayoutSummary {
    const { pictures, portraitPictures } = this.#current();
    return pictureLayoutSummaries(pictures, portraitPictures)[index] as PictureLayoutSummary;
  }

  #indexOf(pictureId: string): number {
    const slideshow = this.#current();
    const index = slideshow.pictures.findIndex((picture) => picture.id === pictureId);
    if (index === -1) {
      throw new Error(`slideshow "${slideshow.id}" holds no picture "${pictureId}"`);
    }
    return index;
  }
}

function ordered(a: number, b: number): readonly [number, number] {
  return a < b ? [a, b] : [b, a];
}
