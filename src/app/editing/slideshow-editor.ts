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
  /** Why the last picture stays, and how to discard the whole slideshow instead. */
  readonly lastPictureText: () => string;
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
  readonly #savingListeners = new Set<(saving: boolean) => void>();
  #unsaved = 0;
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

  /**
   * Called with `true` when an edit starts storing and `false` once every edit made so far is
   * stored (or reported as failed); returns the unsubscribe function.
   */
  subscribeSaving(listener: (saving: boolean) => void): () => void {
    this.#savingListeners.add(listener);
    return () => this.#savingListeners.delete(listener);
  }

  /** The last picture stays; asking to remove it explains why in a toast. */
  remove(pictureId: string): void {
    if (this.#slideshow.pictures.length < 2) {
      this.#ports.toaster.show({ text: this.#ports.lastPictureText(), tone: "info" });
      return;
    }
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
    this.#unsaved += 1;
    if (this.#unsaved === 1) {
      this.#notifySaving(true);
    }
    // IndexedDB commits write transactions on one store in the order they were created.
    const saved = this.#ports.store
      .saveSlideshow(slideshow)
      .catch(this.#ports.onError)
      .then(() => {
        this.#unsaved -= 1;
        if (this.#unsaved === 0) {
          this.#notifySaving(false);
        }
      });
    this.#saving = Promise.all([this.#saving, saved]).then(() => undefined);
    for (const listener of this.#listeners) {
      listener(slideshow);
    }
  }

  #notifySaving(saving: boolean): void {
    for (const listener of this.#savingListeners) {
      listener(saving);
    }
  }
}
