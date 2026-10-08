import {
  movePicture,
  removePicture,
  renameSlideshow,
  restorePictures,
  type RemovedPicture,
} from "../../library/slideshow-edits";
import type { LibraryStore, StoredSlideshow } from "../../library/stored-slideshow";
import type { Toaster, ToastMessage } from "../toast/toaster";

export interface SlideshowEditorPorts {
  readonly store: Pick<LibraryStore, "saveSlideshow">;
  readonly toaster: Pick<Toaster, "current" | "show" | "dismiss">;
  readonly onError: (error: unknown) => void;
  /** The undo toast's text for `count` pictures removed. */
  readonly removedText: (count: number) => string;
  readonly undoLabel: () => string;
  /** The title from the capture dates, which an emptied title falls back to. */
  readonly automaticTitle: (slideshow: StoredSlideshow) => string;
}

/** Removals made while their one undo toast is shown. */
interface RemovalBatch {
  readonly toast: ToastMessage;
  readonly removals: readonly RemovedPicture[];
}

/**
 * The slideshow screen's edits: each applies at once and is stored. Removing needs no
 * confirmation; its toast undoes every removal made while it is shown.
 */
export class SlideshowEditor {
  readonly #ports: SlideshowEditorPorts;
  readonly #listeners = new Set<(slideshow: StoredSlideshow) => void>();
  #slideshow: StoredSlideshow;
  #batch: RemovalBatch | null = null;
  #saving: Promise<void> = Promise.resolve();

  constructor(initial: StoredSlideshow, ports: SlideshowEditorPorts) {
    this.#slideshow = initial;
    this.#ports = ports;
  }

  get slideshow(): StoredSlideshow {
    return this.#slideshow;
  }

  /** Called with every edit; returns the unsubscribe function. */
  subscribe(listener: (slideshow: StoredSlideshow) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /** Throws `LastPictureError` for the last picture: the screen offers no way to do that. */
  remove(pictureId: string): void {
    const { slideshow, removed } = removePicture(this.#slideshow, pictureId);
    const ongoing = this.#batch !== null && this.#ports.toaster.current === this.#batch.toast;
    const removals = [...(ongoing && this.#batch !== null ? this.#batch.removals : []), removed];
    const toast: ToastMessage = {
      text: this.#ports.removedText(removals.length),
      tone: "info",
      action: { label: this.#ports.undoLabel(), run: () => this.#undo(removals) },
    };
    this.#batch = { toast, removals };
    this.#apply(slideshow);
    this.#ports.toaster.show(toast);
  }

  move(pictureId: string, toIndex: number): void {
    const moved = movePicture(this.#slideshow, pictureId, toIndex);
    if (moved !== this.#slideshow) {
      this.#apply(moved);
    }
  }

  rename(typed: string): void {
    const automatic = this.#ports.automaticTitle(this.#slideshow);
    this.#apply(renameSlideshow(this.#slideshow, typed, automatic));
  }

  /** Resolves once every edit made so far is stored (or reported as failed). */
  settled(): Promise<void> {
    return this.#saving;
  }

  /** The screen closes: its undo toast would act on a slideshow no longer shown. */
  dispose(): void {
    if (this.#batch !== null && this.#ports.toaster.current === this.#batch.toast) {
      this.#ports.toaster.dismiss();
    }
    this.#batch = null;
  }

  #undo(removals: readonly RemovedPicture[]): void {
    this.#batch = null;
    this.#apply(restorePictures(this.#slideshow, removals));
  }

  #apply(slideshow: StoredSlideshow): void {
    this.#slideshow = slideshow;
    // IndexedDB commits write transactions on one store in the order they were created.
    const saved = this.#ports.store.saveSlideshow(slideshow).catch(this.#ports.onError);
    this.#saving = Promise.all([this.#saving, saved]).then(() => undefined);
    for (const listener of this.#listeners) {
      listener(slideshow);
    }
  }
}
