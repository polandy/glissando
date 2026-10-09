import { SlideshowNotFoundError, type LibraryStore } from "../../library/stored-slideshow";
import type { StoredSlideshow } from "../../library/stored-slideshow";

export interface EditSaverPorts {
  readonly store: Pick<LibraryStore, "updateSlideshow">;
  readonly onError: (error: unknown) => void;
  /** The slideshow was deleted meanwhile; called once, and nothing is stored after it. */
  readonly onGone: () => void;
}

/**
 * Stores a slideshow's edits in the order they were made and tells when every one of them is
 * stored, so a screen can show that it is saving and a test can wait for it.
 */
export class EditSaver {
  readonly #ports: EditSaverPorts;
  readonly #savingListeners = new Set<(saving: boolean) => void>();
  #unsaved = 0;
  #saving: Promise<void> = Promise.resolve();
  #gone = false;

  constructor(ports: EditSaverPorts) {
    this.#ports = ports;
  }

  /** The slideshow is no longer stored: further edits are not saved. */
  get gone(): boolean {
    return this.#gone;
  }

  /**
   * Called with `true` when an edit starts storing and `false` once every edit made so far is
   * stored (or reported as failed); returns the unsubscribe function.
   */
  subscribeSaving(listener: (saving: boolean) => void): () => void {
    this.#savingListeners.add(listener);
    return () => this.#savingListeners.delete(listener);
  }

  save(slideshow: StoredSlideshow): void {
    this.#unsaved += 1;
    if (this.#unsaved === 1) {
      this.#notifySaving(true);
    }
    // IndexedDB commits write transactions on one store in the order they were created.
    const saved = this.#ports.store
      .updateSlideshow(slideshow)
      .catch((error: unknown) => {
        if (error instanceof SlideshowNotFoundError) {
          this.#goneMeanwhile();
        } else {
          this.#ports.onError(error);
        }
      })
      .then(() => {
        this.#unsaved -= 1;
        if (this.#unsaved === 0) {
          this.#notifySaving(false);
        }
      });
    this.#saving = Promise.all([this.#saving, saved]).then(() => undefined);
  }

  /** Other store work, e.g. a claim or release, counts towards `settled`; its failure is reported. */
  track(work: Promise<void>): void {
    const done = work.catch(this.#ports.onError);
    this.#saving = Promise.all([this.#saving, done]).then(() => undefined);
  }

  /** Resolves once every edit made so far is stored (or reported as failed). */
  settled(): Promise<void> {
    return this.#saving;
  }

  #goneMeanwhile(): void {
    if (this.#gone) {
      return;
    }
    this.#gone = true;
    this.#ports.onGone();
  }

  #notifySaving(saving: boolean): void {
    for (const listener of this.#savingListeners) {
      listener(saving);
    }
  }
}
