import {
  browseFailureOf,
  UNEXPECTED_FAILURE,
  type BrowseFailure,
  type ReportUnavailable,
} from "./browse-failure";
import type { ImmichClient, ImmichPhoto } from "./immich-client";

export interface PhotoFeedState {
  /** Every photo loaded so far, newest first. */
  readonly photos: readonly ImmichPhoto[];
  readonly loading: boolean;
  /** The last page has arrived. */
  readonly done: boolean;
  /** Why the last request failed, or null; `retry()` asks for the same page again. */
  readonly failure: BrowseFailure | null;
}

export interface PhotoFeedOptions {
  readonly client: ImmichClient;
  readonly reportUnavailable: ReportUnavailable;
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
  readonly #reportUnavailable: ReportUnavailable;
  readonly #listeners = new Set<(state: PhotoFeedState) => void>();
  #state: PhotoFeedState = { photos: [], loading: false, done: false, failure: null };
  #nextPage = FIRST_PAGE;

  constructor(options: PhotoFeedOptions) {
    this.#client = options.client;
    this.#albumId = options.albumId;
    this.#reportUnavailable = options.reportUnavailable;
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
    const { loading, done, failure } = this.#state;
    if (loading || done || failure !== null) return;
    await this.#load();
  }

  async retry(): Promise<void> {
    if (this.#state.failure === null) return;
    this.#publish({ ...this.#state, failure: null });
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
        failure: null,
      });
    } catch (error) {
      const failure = browseFailureOf(error, this.#reportUnavailable);
      this.#publish({ ...this.#state, loading: false, failure });
      // An Immich problem is shown as the failure; anything else is a bug to surface, not hide.
      if (failure === UNEXPECTED_FAILURE) throw error;
    }
  }

  #publish(state: PhotoFeedState): void {
    this.#state = state;
    for (const listener of this.#listeners) listener(state);
  }
}
