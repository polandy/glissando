import {
  browseFailureOf,
  UNEXPECTED_FAILURE,
  type BrowseFailure,
  type ReportUnavailable,
} from "../../immich/browse-failure";
import type { ImmichAlbum, ImmichClient } from "../../immich/immich-client";

export interface FrameAlbumsState {
  /** Null until Immich answers. */
  readonly albums: readonly ImmichAlbum[] | null;
  /** Why the last request failed, or null; `retry()` asks again. */
  readonly failure: BrowseFailure | null;
}

export interface FrameAlbumsOptions {
  readonly client: Pick<ImmichClient, "albums">;
  readonly reportUnavailable: ReportUnavailable;
}

/**
 * The set-up screen's album grid (`dev-docs/app/FRAME.md`), published with the Svelte store
 * contract; an Immich problem is shown as the failure, not thrown.
 */
export class FrameAlbums {
  readonly #client: Pick<ImmichClient, "albums">;
  readonly #reportUnavailable: ReportUnavailable;
  readonly #listeners = new Set<(state: FrameAlbumsState) => void>();
  #state: FrameAlbumsState = { albums: null, failure: null };
  #loading: Promise<void> | null = null;

  constructor(options: FrameAlbumsOptions) {
    this.#client = options.client;
    this.#reportUnavailable = options.reportUnavailable;
  }

  get state(): FrameAlbumsState {
    return this.#state;
  }

  subscribe(listener: (state: FrameAlbumsState) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  }

  /** Asks for the albums unless they are here, on their way, or failed (see `retry`). */
  load(): Promise<void> {
    if (this.#state.albums !== null || this.#state.failure !== null) {
      return Promise.resolve();
    }
    this.#loading ??= this.#fetch().finally(() => (this.#loading = null));
    return this.#loading;
  }

  retry(): Promise<void> {
    if (this.#state.failure !== null) {
      this.#publish({ ...this.#state, failure: null });
    }
    return this.load();
  }

  async #fetch(): Promise<void> {
    try {
      const albums = await this.#client.albums();
      this.#publish({ albums, failure: null });
    } catch (error) {
      const failure = browseFailureOf(error, this.#reportUnavailable);
      this.#publish({ ...this.#state, failure });
      // An Immich problem is shown as the failure; anything else is a bug to surface, not hide.
      if (failure === UNEXPECTED_FAILURE) throw error;
    }
  }

  #publish(state: FrameAlbumsState): void {
    this.#state = state;
    for (const listener of this.#listeners) listener(state);
  }
}
