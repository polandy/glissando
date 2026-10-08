import {
  movePicture,
  removePicture,
  renameSlideshow,
  restorePictures,
  type RemovedPicture,
} from "../../library/slideshow-edits";
import {
  SlideshowNotFoundError,
  type LibraryStore,
  type StoredSlideshow,
} from "../../library/stored-slideshow";
import type { Toaster, ToastMessage } from "../toast/toaster";

export interface SlideshowEditorPorts {
  readonly store: Pick<LibraryStore, "updateSlideshow" | "claimMedia" | "releaseClaim">;
  readonly toaster: Pick<Toaster, "current" | "show" | "dismiss">;
  /** A new id for the claim that spares removed pictures' media while they can be undone. */
  readonly newId: () => string;
  readonly now: () => Date;
  readonly onError: (error: unknown) => void;
  /** The slideshow was deleted meanwhile, e.g. in another tab; edits are no longer stored. */
  readonly onGone: () => void;
  /** The undo toast's text for `count` pictures removed. */
  readonly removedText: (count: number) => string;
  readonly undoLabel: () => string;
  /** Why the last picture stays, and how to discard the whole slideshow instead. */
  readonly lastPictureText: () => string;
  /** The title from the capture dates, which an emptied title falls back to. */
  readonly automaticTitle: (slideshow: StoredSlideshow) => string;
}

/** Removals made while their one undo toast is shown, and the claim sparing their media. */
interface RemovalBatch {
  readonly toast: ToastMessage;
  readonly removals: readonly RemovedPicture[];
  readonly claimId: string;
}

/**
 * The slideshow screen's edits: each applies at once and is stored. Removing needs no
 * confirmation; its toast undoes every removal made while it is shown, and any other edit
 * ends that batch, so an undo never puts pictures back at positions that shifted meanwhile.
 * While the toast is shown, the removed pictures' media is claimed, so a clean-up in any tab
 * spares it.
 */
export class SlideshowEditor {
  readonly #ports: SlideshowEditorPorts;
  readonly #listeners = new Set<(slideshow: StoredSlideshow) => void>();
  readonly #savingListeners = new Set<(saving: boolean) => void>();
  #unsaved = 0;
  #slideshow: StoredSlideshow;
  #batch: RemovalBatch | null = null;
  #saving: Promise<void> = Promise.resolve();
  #gone = false;

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
    // A batch exists only while its toast is shown (see #closed).
    const ongoing = this.#batch;
    const claimId = ongoing?.claimId ?? this.#ports.newId();
    // Claimed before the save that drops the reference, so no clean-up can fall in between.
    this.#track(this.#ports.store.claimMedia(claimId, this.#ports.now(), removed.picture.id));
    const removals = [...(ongoing?.removals ?? []), removed];
    const toast: ToastMessage = {
      text: this.#ports.removedText(removals.length),
      tone: "info",
      action: { label: this.#ports.undoLabel(), run: () => this.#undo(batch) },
      onClosed: () => this.#closed(toast),
    };
    const batch: RemovalBatch = { toast, removals, claimId };
    this.#batch = batch;
    this.#apply(slideshow);
    this.#ports.toaster.show(toast);
  }

  move(pictureId: string, toIndex: number): void {
    const moved = movePicture(this.#slideshow, pictureId, toIndex);
    if (moved !== this.#slideshow) {
      this.#endBatch();
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
    this.#endBatch();
  }

  #undo(batch: RemovalBatch): void {
    this.#batch = null;
    this.#apply(restorePictures(this.#slideshow, batch.removals));
    // Released after the restoring save is queued: a clean-up queued in between waits for it.
    this.#release(batch.claimId);
  }

  /** The undo toast left without being used: the removals are final. */
  #closed(toast: ToastMessage): void {
    if (this.#batch?.toast === toast) {
      const { claimId } = this.#batch;
      this.#batch = null;
      this.#release(claimId);
    }
  }

  #endBatch(): void {
    const batch = this.#batch;
    if (batch === null) {
      return;
    }
    this.#batch = null;
    if (this.#ports.toaster.current === batch.toast) {
      this.#ports.toaster.dismiss();
    }
    this.#release(batch.claimId);
  }

  #release(claimId: string): void {
    this.#track(this.#ports.store.releaseClaim(claimId));
  }

  #apply(slideshow: StoredSlideshow): void {
    if (this.#gone) {
      return;
    }
    this.#slideshow = slideshow;
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
    for (const listener of this.#listeners) {
      listener(slideshow);
    }
  }

  #goneMeanwhile(): void {
    if (this.#gone) {
      return;
    }
    this.#gone = true;
    this.#endBatch();
    this.#ports.onGone();
  }

  /** A claim or release counts towards `settled`; its failure is reported. */
  #track(work: Promise<void>): void {
    const done = work.catch(this.#ports.onError);
    this.#saving = Promise.all([this.#saving, done]).then(() => undefined);
  }

  #notifySaving(saving: boolean): void {
    for (const listener of this.#savingListeners) {
      listener(saving);
    }
  }
}
