import type { Toaster, ToastMessage } from "../toast/toaster";

/** The undo of the latest shuffle: its toast brings the order from before it back. */
export class ShuffleUndo {
  readonly #toaster: Pick<Toaster, "current" | "show" | "dismiss">;
  readonly #undoLabel: () => string;
  #pending: ToastMessage | null = null;

  constructor(toaster: Pick<Toaster, "current" | "show" | "dismiss">, undoLabel: () => string) {
    this.#toaster = toaster;
    this.#undoLabel = undoLabel;
  }

  /** Shows `text` with an undo that runs `restore`, unless the undo has ended meanwhile. */
  offer(text: string, restore: () => void): void {
    const toast: ToastMessage = {
      text,
      tone: "info",
      action: { label: this.#undoLabel(), run: () => this.#undo(toast, restore) },
    };
    this.#pending = toast;
    this.#toaster.show(toast);
  }

  /** Dismisses the pending undo's toast; its undo no longer applies. */
  end(): void {
    const pending = this.#pending;
    this.#pending = null;
    if (pending !== null && this.#toaster.current === pending) {
      this.#toaster.dismiss();
    }
  }

  #undo(toast: ToastMessage, restore: () => void): void {
    if (this.#pending !== toast) {
      return;
    }
    this.#pending = null;
    restore();
  }
}
