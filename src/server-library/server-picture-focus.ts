import type { StoredFocus } from "../library/picture-focus";
import {
  ServerLibraryNotFoundError,
  ServerLibraryUnavailableError,
  type ServerLibraryClient,
} from "./server-library-client";

export interface ServerPictureFocusOptions {
  readonly client: Pick<ServerLibraryClient, "slideshowFocus" | "putPictureFocus">;
  /** Logs a focus PUT the server could not be reached for, or that named a slideshow it lost. */
  log(error: unknown): void;
}

/** A focus put this session, kept until the server has confirmed it (ADR-0041). */
interface SessionFocus {
  readonly stored: StoredFocus;
  readonly confirmed: boolean;
}

/**
 * A server slideshow's pictures' focus (ADR-0041): the server's, asked once per slideshow and
 * cached for the session until that slideshow is re-read or saved, laid over by whatever this
 * session has put. `ServerSlideshowStore` calls `noteSlideshow` whenever it reads or saves a
 * slideshow, so a picture's id can be traced back to the slideshow to ask or put its focus on.
 */
export class ServerPictureFocus {
  readonly #client: ServerPictureFocusOptions["client"];
  readonly #log: (error: unknown) => void;
  readonly #slideshowOf = new Map<string, string>();
  readonly #serverFocus = new Map<string, Promise<ReadonlyMap<string, StoredFocus>>>();
  readonly #session = new Map<string, SessionFocus>();

  constructor(options: ServerPictureFocusOptions) {
    this.#client = options.client;
    this.#log = options.log;
  }

  /** A slideshow read or saved: its pictures trace to it, its cached server focus is stale. */
  noteSlideshow(slideshowId: string, assetIds: readonly string[]): void {
    for (const assetId of assetIds) this.#slideshowOf.set(assetId, slideshowId);
    this.#serverFocus.delete(slideshowId);
  }

  /** The focus the UI shows: the server's, overridden by whatever this session has put. */
  pictureFocus(assetIds: readonly string[]): Promise<ReadonlyMap<string, StoredFocus>> {
    return this.#focusOf(assetIds, true);
  }

  /**
   * The focus the background pass treats as settled: a focus put this session but not yet
   * confirmed on the server counts as unstored, so the pass detects and puts it again.
   */
  pictureFocusForPass(assetIds: readonly string[]): Promise<ReadonlyMap<string, StoredFocus>> {
    return this.#focusOf(assetIds, false);
  }

  /**
   * Keeps `stored` for the session at once, then puts it on the server. A newer focus already
   * there is kept, and this slideshow's cached focus is refreshed. The server being unreachable,
   * or no longer having the slideshow, is logged and leaves the session result unconfirmed: the
   * pass finds the picture unstored and puts it again on its next run.
   */
  async putPictureFocus(assetId: string, stored: StoredFocus): Promise<void> {
    this.#session.set(assetId, { stored, confirmed: false });
    const slideshowId = this.#slideshowOf.get(assetId);
    if (slideshowId === undefined) {
      throw new Error(`picture "${assetId}" is not of any slideshow this store has read`);
    }
    let outcome: "stored" | "newerKept";
    try {
      outcome = await this.#client.putPictureFocus(slideshowId, assetId, stored);
    } catch (error) {
      const slideshowGone = error instanceof ServerLibraryNotFoundError;
      if (!slideshowGone && !(error instanceof ServerLibraryUnavailableError)) {
        throw error;
      }
      this.#log(error);
      if (slideshowGone) this.#session.delete(assetId);
      return;
    }
    if (outcome === "newerKept") {
      this.#session.delete(assetId);
      this.#serverFocus.delete(slideshowId);
      return;
    }
    this.#session.set(assetId, { stored, confirmed: true });
  }

  async #focusOf(
    assetIds: readonly string[],
    includeUnconfirmed: boolean,
  ): Promise<ReadonlyMap<string, StoredFocus>> {
    const slideshowIds = new Set(
      assetIds.flatMap((id) => {
        const slideshowId = this.#slideshowOf.get(id);
        return slideshowId === undefined ? [] : [slideshowId];
      }),
    );
    const fromServer = new Map<string, StoredFocus>();
    for (const map of await Promise.all([...slideshowIds].map((id) => this.#serverFocusOf(id)))) {
      for (const [assetId, focus] of map) fromServer.set(assetId, focus);
    }
    for (const [assetId, session] of this.#session) {
      if (includeUnconfirmed || session.confirmed) fromServer.set(assetId, session.stored);
    }
    const result = new Map<string, StoredFocus>();
    for (const assetId of assetIds) {
      const focus = fromServer.get(assetId);
      if (focus !== undefined) result.set(assetId, focus);
    }
    return result;
  }

  #serverFocusOf(slideshowId: string): Promise<ReadonlyMap<string, StoredFocus>> {
    const cached = this.#serverFocus.get(slideshowId);
    if (cached !== undefined) return cached;
    const asking = this.#client.slideshowFocus(slideshowId).catch((error: unknown) => {
      this.#serverFocus.delete(slideshowId);
      throw error;
    });
    this.#serverFocus.set(slideshowId, asking);
    return asking;
  }
}
