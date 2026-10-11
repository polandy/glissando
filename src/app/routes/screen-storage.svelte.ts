import type { StoredSlideshow } from "../../library/stored-slideshow";
import type { SlideshowEditor } from "../editing/slideshow-editor";
import type { SlideshowStorage, StorageAction } from "../screens/view-models";
import type { ShareLinkSession } from "../share-link/share-link-session";
import { slideshowStorage, type SlideshowHome, type StorageFacts } from "./slideshow-storage";

/** A copy to the other home, confirmed in its own sheet. */
export type StorageCopy = Exclude<StorageAction, "removeMissing">;

/** What the slideshow screen's storage and share rows need, fixed for the screen's lifetime. */
export interface ScreenStoragePorts {
  readonly home: SlideshowHome;
  readonly slideshowId: string;
  readonly newShareLinkSession: (slideshowId: string) => ShareLinkSession;
  readonly thumbnails: {
    /** Pictures Immich no longer has. */
    readonly missing: ReadonlySet<string>;
    missingCount(stored: StoredSlideshow): number;
  };
  /** Null until the slideshow loaded. */
  readonly editor: () => SlideshowEditor | null;
}

/**
 * Where the shown slideshow lives (SERVER_LIBRARY.md) and its link (SHARE_LINK.md, In the app):
 * the storage row's actions and the share link session the screen owns.
 */
export class ScreenStorage {
  /** The copy whose confirmation sheet is open. */
  confirmingCopy = $state<StorageCopy | null>(null);
  /** A server slideshow's link; a device slideshow has none. */
  readonly shareLink: ShareLinkSession | null;
  readonly #ports: ScreenStoragePorts;

  constructor(ports: ScreenStoragePorts) {
    this.#ports = ports;
    this.shareLink = ports.home === "server" ? ports.newShareLinkSession(ports.slideshowId) : null;
  }

  /** The storage row as it shows `stored`. */
  of(stored: StoredSlideshow, facts: Omit<StorageFacts, "missingCount">): SlideshowStorage | null {
    const missingCount = this.#ports.thumbnails.missingCount(stored);
    return slideshowStorage(this.#ports.home, stored, { ...facts, missingCount });
  }

  readonly act = (action: StorageAction): void => {
    if (action === "removeMissing") {
      const editor = this.#ports.editor();
      for (const id of this.#ports.thumbnails.missing) editor?.remove(id);
    } else this.confirmingCopy = action;
  };

  readonly closeCopy = (): void => {
    this.confirmingCopy = null;
  };

  /** The screen closed. */
  dispose(): void {
    this.shareLink?.dispose();
  }
}
