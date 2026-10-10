import type { LibraryStore, StoredSlideshow } from "../../library/stored-slideshow";
import { exportMediaKey } from "./export-menu";

/**
 * The .glissando file's size for the ⋯ menu: measured when the menu opens and the media changed
 * since the last measure, since measuring reads every media record.
 */
export class ExportSize {
  bytes = $state<number | null>(null);
  readonly #store: Pick<LibraryStore, "mediaBytes">;
  readonly #onError: (error: unknown) => void;
  readonly #left: AbortSignal;
  /** The media the size is measured for; see `exportMediaKey`. */
  #measured: string | null = null;

  constructor(
    store: Pick<LibraryStore, "mediaBytes">,
    onError: (error: unknown) => void,
    left: AbortSignal,
  ) {
    this.#store = store;
    this.#onError = onError;
    this.#left = left;
  }

  measure(slideshow: StoredSlideshow): void {
    const media = exportMediaKey(slideshow);
    if (media === this.#measured) {
      return;
    }
    this.#measured = media;
    this.bytes = null;
    this.#store.mediaBytes(slideshow).then(
      (bytes) => {
        if (!this.#left.aborted && this.#measured === media) {
          this.bytes = bytes;
        }
      },
      (error: unknown) => {
        this.#measured = null;
        this.#onError(error);
      },
    );
  }
}
