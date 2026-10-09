import type { StoredPicture } from "../../library/stored-slideshow";
import type { Toaster, ToastMessage } from "../toast/toaster";

/**
 * The settings a reset drops: a picture's own ones ("Back to automatic") and the slideshow's
 * default transition ("Back to crossfade").
 */
export type ResettableSetting =
  keyof Pick<StoredPicture, "kenBurns" | "durationMs" | "transition"> | "slideshowTransition";

interface PendingReset {
  readonly toast: ToastMessage;
  /** The picture's id, or the slideshow's for its default transition. */
  readonly ownerId: string;
  readonly setting: ResettableSetting;
}

/**
 * The undo of the latest reset: its toast brings the dropped setting back. Only one is pending
 * at a time, as only one toast is shown.
 */
export class ResetUndo {
  readonly #toaster: Pick<Toaster, "current" | "show" | "dismiss">;
  readonly #undoLabel: () => string;
  #pending: PendingReset | null = null;

  constructor(toaster: Pick<Toaster, "current" | "show" | "dismiss">, undoLabel: () => string) {
    this.#toaster = toaster;
    this.#undoLabel = undoLabel;
  }

  /** Shows `text` with an undo that runs `restore`, unless the undo has ended meanwhile. */
  offer(ownerId: string, setting: ResettableSetting, text: string, restore: () => void): void {
    const toast: ToastMessage = {
      text,
      tone: "info",
      action: { label: this.#undoLabel(), run: () => this.#undo(pending, restore) },
    };
    const pending: PendingReset = { toast, ownerId, setting };
    this.#pending = pending;
    this.#toaster.show(toast);
  }

  /** A newer value for the setting ends its undo, which would otherwise overwrite that value. */
  supersede(ownerId: string, setting: ResettableSetting): void {
    if (this.#pending?.ownerId === ownerId && this.#pending.setting === setting) {
      this.end();
    }
  }

  /** Dismisses the pending undo's toast; its undo no longer applies. */
  end(): void {
    const pending = this.#pending;
    if (pending === null) {
      return;
    }
    this.#pending = null;
    if (this.#toaster.current === pending.toast) {
      this.#toaster.dismiss();
    }
  }

  #undo(pending: PendingReset, restore: () => void): void {
    if (this.#pending !== pending) {
      return;
    }
    this.#pending = null;
    restore();
  }
}
