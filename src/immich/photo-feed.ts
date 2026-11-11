import {
  browseFailureOf,
  UNEXPECTED_FAILURE,
  type BrowseFailure,
  type ReportUnavailable,
} from "./browse-failure";
import type { ImmichClient, ImmichPhoto, PhotoSource } from "./immich-client";

export interface PhotoFeedState {
  /** Every photo loaded so far, newest first. */
  readonly photos: readonly ImmichPhoto[];
  /** The `takenAt` of every image left out so far because it is not a JPEG. */
  readonly hiddenTakenAt: readonly string[];
  readonly loading: boolean;
  /** The last page has arrived. */
  readonly done: boolean;
  /** Why the last request failed, or null; `retry()` asks for the same page again. */
  readonly failure: BrowseFailure | null;
}

export interface PhotoFeedOptions {
  readonly client: ImmichClient;
  readonly reportUnavailable: ReportUnavailable;
  readonly source: PhotoSource;
  /** Videos among the photos, as a device import downloads them. */
  readonly withVideos?: boolean;
}

const FIRST_PAGE = 1;

/** One source's photos a page at a time (Svelte store); `loadMore()` may be called freely. */
export class PhotoFeed {
  readonly #client: ImmichClient;
  readonly #source: PhotoSource;
  readonly #withVideos: boolean;
  readonly #reportUnavailable: ReportUnavailable;
  readonly #listeners = new Set<(state: PhotoFeedState) => void>();
  #state: PhotoFeedState = {
    photos: [],
    hiddenTakenAt: [],
    loading: false,
    done: false,
    failure: null,
  };
  #nextPage = FIRST_PAGE;

  constructor(options: PhotoFeedOptions) {
    this.#client = options.client;
    this.#source = options.source;
    this.#withVideos = options.withVideos === true;
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
      // A page without a JPEG still has a next one; reading on keeps the end-of-list observer going.
      for (;;) {
        const page = await this.#client.photos({
          page: this.#nextPage,
          source: this.#source,
          ...(this.#withVideos ? { withVideos: true } : {}),
        });
        if (page.nextPage !== null) this.#nextPage = page.nextPage;
        const done = page.nextPage === null;
        const photos = [...this.#state.photos, ...page.photos];
        const hiddenTakenAt = [...this.#state.hiddenTakenAt, ...page.hiddenTakenAt];
        const keepReading = !done && page.photos.length === 0;
        this.#publish({ photos, hiddenTakenAt, loading: keepReading, done, failure: null });
        if (!keepReading) return;
      }
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
