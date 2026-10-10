import { LastPictureError } from "../../library/slideshow-edits";
import type { Toaster, ToastMessage } from "../toast/toaster";

export interface AddUndoPorts {
  readonly toaster: Pick<Toaster, "current" | "show" | "dismiss">;
  readonly undoLabel: () => string;
  /** The toast's text for `count` pictures added. */
  readonly addedText: (count: number) => string;
  readonly lastPictureText: () => string;
  /** Takes the pictures still in the slideshow out; throws `LastPictureError` if none would stay. */
  readonly takeOut: (pictureIds: readonly string[]) => void;
}

/**
 * The undo of pictures just added: its toast takes them out again. Their media is not claimed,
 * so once taken out the next clean-up deletes it.
 */
export class AddUndo {
  readonly #ports: AddUndoPorts;
  #pending: ToastMessage | null = null;

  constructor(ports: AddUndoPorts) {
    this.#ports = ports;
  }

  offer(pictureIds: readonly string[]): void {
    const toast: ToastMessage = {
      text: this.#ports.addedText(pictureIds.length),
      tone: "info",
      action: { label: this.#ports.undoLabel(), run: () => this.#undo(toast, pictureIds) },
    };
    this.#pending = toast;
    this.#ports.toaster.show(toast);
  }

  /** Dismisses the pending undo's toast; its undo no longer applies. */
  end(): void {
    const pending = this.#pending;
    this.#pending = null;
    if (pending !== null && this.#ports.toaster.current === pending) {
      this.#ports.toaster.dismiss();
    }
  }

  #undo(toast: ToastMessage, pictureIds: readonly string[]): void {
    if (this.#pending !== toast) {
      return;
    }
    this.#pending = null;
    try {
      this.#ports.takeOut(pictureIds);
    } catch (error) {
      if (!(error instanceof LastPictureError)) {
        throw error;
      }
      this.#ports.toaster.show({ text: this.#ports.lastPictureText(), tone: "info" });
    }
  }
}
