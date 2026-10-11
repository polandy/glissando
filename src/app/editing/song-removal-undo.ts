import type { StoredMusic } from "../../library/stored-slideshow";
import type { RemovalUndoPorts } from "./removal-undo";
import type { ToastMessage } from "../toast/toaster";

export type SongRemovalUndoPorts = Omit<RemovalUndoPorts, "removedText"> & {
  /** The undo toast's text after a song was removed. */
  readonly songRemovedText: () => string;
};

/** A removed song, its place in the playlist and the claim sparing its media. */
interface SongRemoval {
  readonly toast: ToastMessage;
  readonly claimId: string;
}

/**
 * The undo of a removed song: its toast puts the song back at its place. While the toast is
 * shown, the song's media is claimed, so a clean-up in any tab spares it; a later removal makes
 * the earlier one final.
 */
export class SongRemovalUndo {
  readonly #ports: SongRemovalUndoPorts;
  #shown: SongRemoval | null = null;

  constructor(ports: SongRemovalUndoPorts) {
    this.#ports = ports;
  }

  /**
   * Claims the song's media and shows the toast whose undo hands `restore` the song and its
   * place. Call it before the save that drops the song, so no clean-up can fall in between.
   */
  add(song: StoredMusic, index: number, restore: (song: StoredMusic, index: number) => void): void {
    this.end();
    const claimId = this.#ports.newId();
    this.#ports.track(this.#ports.store.claimMedia(claimId, this.#ports.now(), song.id));
    const toast: ToastMessage = {
      text: this.#ports.songRemovedText(),
      tone: "info",
      action: {
        label: this.#ports.undoLabel(),
        run: () => {
          this.#shown = null;
          restore(song, index);
          // Released after the restoring save is queued: a clean-up queued in between waits for it.
          this.#release(claimId);
        },
      },
      onClosed: () => {
        if (this.#shown?.toast === toast) this.end();
      },
    };
    this.#shown = { toast, claimId };
    this.#ports.toaster.show(toast);
  }

  /** The removal becomes final and its toast is dismissed. */
  end(): void {
    const shown = this.#shown;
    if (shown === null) return;
    this.#shown = null;
    if (this.#ports.toaster.current === shown.toast) this.#ports.toaster.dismiss();
    this.#release(shown.claimId);
  }

  #release(claimId: string): void {
    this.#ports.track(this.#ports.store.releaseClaim(claimId));
  }
}
