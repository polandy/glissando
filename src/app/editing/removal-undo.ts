import type { RemovedPicture } from "../../library/slideshow-edits";
import type { LibraryStore } from "../../library/stored-slideshow";
import type { Toaster, ToastMessage } from "../toast/toaster";

export interface RemovalUndoPorts {
  readonly store: Pick<LibraryStore, "claimMedia" | "releaseClaim">;
  readonly toaster: Pick<Toaster, "current" | "show" | "dismiss">;
  /** A new id for the claim that spares removed pictures' media while they can be undone. */
  readonly newId: () => string;
  readonly now: () => Date;
  /** Hands the store's work to the editor's saver, which reports its failure. */
  readonly track: (work: Promise<void>) => void;
  /** The undo toast's text for `count` pictures removed. */
  readonly removedText: (count: number) => string;
  readonly undoLabel: () => string;
}

/** Removals made while their one undo toast is shown, and the claim sparing their media. */
interface RemovalBatch {
  readonly toast: ToastMessage;
  readonly removals: readonly RemovedPicture[];
  readonly claimId: string;
}

/**
 * The undo of removed pictures: one toast undoes every removal made while it is shown. While
 * it is shown, the removed pictures' media is claimed, so a clean-up in any tab spares it.
 */
export class RemovalUndo {
  readonly #ports: RemovalUndoPorts;
  #batch: RemovalBatch | null = null;

  constructor(ports: RemovalUndoPorts) {
    this.#ports = ports;
  }

  /**
   * Claims the removed picture's media and adds it to the shown batch, or starts one. Call it
   * before the save that drops the picture, so no clean-up can fall in between. The toast's
   * undo hands `restore` every removal of the batch.
   */
  add(removed: RemovedPicture, restore: (removals: readonly RemovedPicture[]) => void): void {
    // A batch exists only while its toast is shown (see #closed).
    const ongoing = this.#batch;
    const claimId = ongoing?.claimId ?? this.#ports.newId();
    this.#ports.track(this.#ports.store.claimMedia(claimId, this.#ports.now(), removed.picture.id));
    const removals = [...(ongoing?.removals ?? []), removed];
    const toast: ToastMessage = {
      text: this.#ports.removedText(removals.length),
      tone: "info",
      action: { label: this.#ports.undoLabel(), run: () => this.#undo(batch, restore) },
      onClosed: () => this.#closed(toast),
    };
    const batch: RemovalBatch = { toast, removals, claimId };
    this.#batch = batch;
    this.#ports.toaster.show(toast);
  }

  /** The removals become final and their toast is dismissed. */
  end(): void {
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

  #undo(batch: RemovalBatch, restore: (removals: readonly RemovedPicture[]) => void): void {
    this.#batch = null;
    restore(batch.removals);
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

  #release(claimId: string): void {
    this.#ports.track(this.#ports.store.releaseClaim(claimId));
  }
}
