/** A sheet or dialog of the slideshow screen; the chapter sheet carries its chapter's anchor. */
export type OpenSheet =
  | {
      readonly kind:
        | "transitions"
        | "look"
        | "mood"
        | "portraitPictures"
        | "openingCard"
        | "closingCard"
        | "share"
        | "focus"
        | "delete";
    }
  | { readonly kind: "chapter"; readonly anchorPictureId: string };

/**
 * Which of the slideshow screen's sheets is open: at most one. Opening is plain state, so an
 * opener needs no handle on the component that renders the sheet.
 */
export class SlideshowSheets {
  #current = $state.raw<OpenSheet | null>(null);
  readonly #onClosed: (closed: OpenSheet) => void;

  /** `onClosed` gives focus back to the opener of a sheet the user closed. */
  constructor(onClosed: (closed: OpenSheet) => void) {
    this.#onClosed = onClosed;
  }

  get current(): OpenSheet | null {
    return this.#current;
  }

  open(sheet: OpenSheet): void {
    this.#current = sheet;
  }

  /** The user closed the sheet: focus goes back to where it was opened from. */
  close(): void {
    const closed = this.#current;
    if (closed === null) return;
    this.#current = null;
    this.#onClosed(closed);
  }

  /** The sheet led on to something else (the picture editor, deleting), which takes focus. */
  handOff(): void {
    this.#current = null;
  }
}
