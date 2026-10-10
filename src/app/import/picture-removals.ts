import type { PictureImport } from "../../import/picture-import";
import type { StoredPicture } from "../../library/stored-slideshow";
import type { Toaster, ToastMessage } from "../toast/toaster";

export interface PictureRemovalsPorts {
  readonly pictures: Pick<PictureImport, "remove" | "restore">;
  readonly toaster: Pick<Toaster, "current" | "show" | "dismiss">;
  /** The undo toast's text for `count` pictures removed. */
  readonly removedText: (count: number) => string;
  readonly undoLabel: () => string;
}

/** Removals made while their one undo toast is shown. */
interface RemovalBatch {
  readonly toast: ToastMessage;
  readonly removed: readonly StoredPicture[];
}

/**
 * Pictures taken out of an import before it is created, never confirmed: one toast undoes every
 * removal made while it is shown. The import's own claim spares the removed pictures' media, so
 * nothing is claimed here.
 */
export class PictureRemovals {
  readonly #ports: PictureRemovalsPorts;
  #batch: RemovalBatch | null = null;

  constructor(ports: PictureRemovalsPorts) {
    this.#ports = ports;
  }

  remove(pictureId: string): void {
    const removed = [...(this.#batch?.removed ?? []), this.#ports.pictures.remove(pictureId)];
    const toast: ToastMessage = {
      text: this.#ports.removedText(removed.length),
      tone: "info",
      action: { label: this.#ports.undoLabel(), run: () => this.#undo(batch) },
      onClosed: () => this.#closed(toast),
    };
    const batch: RemovalBatch = { toast, removed };
    this.#batch = batch;
    this.#ports.toaster.show(toast);
  }

  /** The removals become final and their toast is dismissed, such as on leaving the step. */
  end(): void {
    const batch = this.#batch;
    this.#batch = null;
    if (batch !== null && this.#ports.toaster.current === batch.toast) {
      this.#ports.toaster.dismiss();
    }
  }

  #undo(batch: RemovalBatch): void {
    this.#batch = null;
    this.#ports.pictures.restore(batch.removed);
  }

  /** The undo toast left without being used: the removals are final. */
  #closed(toast: ToastMessage): void {
    if (this.#batch?.toast === toast) {
      this.#batch = null;
    }
  }
}
