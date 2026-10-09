import { ImmichUnavailableError, type ImmichClient, type ImmichPhoto } from "./immich-client";

export interface PhotoFeedState {
  /** Every photo loaded so far, newest first. */
  readonly photos: readonly ImmichPhoto[];
  readonly loading: boolean;
  /** The last page has arrived. */
  readonly done: boolean;
  /** The last request failed; `retry()` asks for the same page again. */
  readonly failed: boolean;
}

export interface PhotoFeedOptions {
  readonly client: ImmichClient;
  /** One album's photos; the whole library without it. */
  readonly albumId?: string;
}

const FIRST_PAGE = 1;

/**
 * The library's or an album's photos, a page at a time, published with the Svelte store
 * contract. The infinite-scroll list calls `loadMore()` whenever its end comes into view, so
 * calls while a page is under way, after the last page or after a failure are ignored.
 */
export class PhotoFeed {
  readonly #client: ImmichClient;
  readonly #albumId: string | undefined;
  readonly #listeners = new Set<(state: PhotoFeedState) => void>();
  #state: PhotoFeedState = { photos: [], loading: false, done: false, failed: false };
  #nextPage = FIRST_PAGE;

  constructor(options: PhotoFeedOptions) {
    this.#client = options.client;
    this.#albumId = options.albumId;
  }

  get state(): PhotoFeedState {
    return this.#state;
  }

  subscribe(listener: (state: PhotoFeedState) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  }

  async loadMore(): Promise<void> {
    const { loading, done, failed } = this.#state;
    if (loading || done || failed) return;
    await this.#load();
  }

  async retry(): Promise<void> {
    if (!this.#state.failed) return;
    this.#publish({ ...this.#state, failed: false });
    await this.#load();
  }

  async #load(): Promise<void> {
    this.#publish({ ...this.#state, loading: true });
    try {
      const page = await this.#client.photos(
        this.#albumId === undefined
          ? { page: this.#nextPage }
          : { page: this.#nextPage, albumId: this.#albumId },
      );
      if (page.nextPage !== null) this.#nextPage = page.nextPage;
      this.#publish({
        photos: [...this.#state.photos, ...page.photos],
        loading: false,
        done: page.nextPage === null,
        failed: false,
      });
    } catch (error) {
      this.#publish({ ...this.#state, loading: false, failed: true });
      // Unavailability is shown as "failed"; anything else is a bug to surface, not hide.
      if (!(error instanceof ImmichUnavailableError)) throw error;
    }
  }

  #publish(state: PhotoFeedState): void {
    this.#state = state;
    for (const listener of this.#listeners) listener(state);
  }
}
