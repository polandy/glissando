import {
  ImmichUnavailableError,
  type ImmichAlbum,
  type ImmichClient,
  type ImmichPhoto,
} from "../../immich/immich-client";
import { PhotoFeed } from "../../immich/photo-feed";
import { allAlbumPhotos, PhotoSelection } from "../../immich/photo-selection";
import type { AlbumMembership } from "./immich-view";

export type BrowserTab = "photos" | "albums";

export interface ImmichBrowserState {
  readonly tab: BrowserTab;
  /** Null until the albums have arrived. */
  readonly albums: readonly ImmichAlbum[] | null;
  /** The last album request failed; `retryAlbums()` asks again. */
  readonly albumsFailed: boolean;
  /** Albums whose photos are being fetched to select them all. */
  readonly busyAlbumIds: ReadonlySet<string>;
  /** What is known of each album's photos, for its badge and the footer's "from k albums". */
  readonly membership: ReadonlyMap<string, AlbumMembership>;
}

export interface ImmichBrowserOptions {
  readonly client: ImmichClient;
}

/**
 * The Immich browser's memory for one import: the selection, the tab, the albums and the feeds
 * already read, so going into an album and back, or to the pictures step and back, keeps them.
 * Published with the Svelte store contract.
 */
export class ImmichBrowser {
  readonly selection = new PhotoSelection();
  readonly library: PhotoFeed;
  readonly #client: ImmichClient;
  readonly #listeners = new Set<(state: ImmichBrowserState) => void>();
  readonly #albumFeeds = new Map<string, PhotoFeed>();
  readonly #albumPhotos = new Map<string, Map<string, ImmichPhoto>>();
  readonly #completeAlbums = new Set<string>();
  #albumsLoad: Promise<void> | null = null;
  #state: ImmichBrowserState = {
    tab: "photos",
    albums: null,
    albumsFailed: false,
    busyAlbumIds: new Set(),
    membership: new Map(),
  };

  constructor(options: ImmichBrowserOptions) {
    this.#client = options.client;
    this.library = new PhotoFeed({ client: options.client });
  }

  get state(): ImmichBrowserState {
    return this.#state;
  }

  subscribe(listener: (state: ImmichBrowserState) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  }

  showTab(tab: BrowserTab): void {
    if (tab !== this.#state.tab) this.#publish({ ...this.#state, tab });
  }

  /** Asks for the albums unless they are here, on their way, or failed (see `retryAlbums`). */
  loadAlbums(): Promise<void> {
    if (this.#state.albums !== null || this.#state.albumsFailed) return Promise.resolve();
    this.#albumsLoad ??= this.#fetchAlbums().finally(() => (this.#albumsLoad = null));
    return this.#albumsLoad;
  }

  retryAlbums(): Promise<void> {
    if (this.#state.albumsFailed) this.#publish({ ...this.#state, albumsFailed: false });
    return this.loadAlbums();
  }

  /** The album's own feed, the same one on every visit. */
  albumFeed(albumId: string): PhotoFeed {
    let feed = this.#albumFeeds.get(albumId);
    if (feed === undefined) {
      feed = new PhotoFeed({ client: this.#client, albumId });
      this.#albumFeeds.set(albumId, feed);
      feed.subscribe(({ photos, done }) => this.#learn(albumId, photos, done));
    }
    return feed;
  }

  /** Selects every photo of the album, or deselects them when all already are. */
  async toggleAlbum(albumId: string): Promise<void> {
    if (this.#state.busyAlbumIds.has(albumId)) return;
    const known = this.#albumPhotos.get(albumId);
    if (this.#completeAlbums.has(albumId) && known !== undefined) {
      const photos = [...known.values()];
      if (photos.every(({ id }) => this.selection.has(id))) {
        this.selection.deselectAll(photos);
      } else {
        this.selection.selectAll(photos);
      }
      return;
    }
    this.#setBusy(albumId, true);
    try {
      const photos = await allAlbumPhotos(this.#client, albumId);
      this.#learn(albumId, photos, true);
      this.selection.selectAll(photos);
    } catch (error) {
      if (!(error instanceof ImmichUnavailableError)) throw error;
      this.#publish({ ...this.#state, albumsFailed: true });
    } finally {
      this.#setBusy(albumId, false);
    }
  }

  async #fetchAlbums(): Promise<void> {
    try {
      const albums = await this.#client.albums();
      this.#publish({ ...this.#state, albums, albumsFailed: false });
    } catch (error) {
      this.#publish({ ...this.#state, albumsFailed: true });
      // Unavailability is shown as "failed"; anything else is a bug to surface, not hide.
      if (!(error instanceof ImmichUnavailableError)) throw error;
    }
  }

  #learn(albumId: string, photos: readonly ImmichPhoto[], complete: boolean): void {
    const known = this.#albumPhotos.get(albumId) ?? new Map<string, ImmichPhoto>();
    const before = known.size;
    for (const photo of photos) known.set(photo.id, photo);
    this.#albumPhotos.set(albumId, known);
    const wasComplete = this.#completeAlbums.has(albumId);
    if (complete) this.#completeAlbums.add(albumId);
    if (known.size === before && wasComplete === this.#completeAlbums.has(albumId)) return;
    const membership = new Map(this.#state.membership);
    membership.set(albumId, {
      photoIds: new Set(known.keys()),
      complete: this.#completeAlbums.has(albumId),
    });
    this.#publish({ ...this.#state, membership });
  }

  #setBusy(albumId: string, busy: boolean): void {
    const busyAlbumIds = new Set(this.#state.busyAlbumIds);
    if (busy) busyAlbumIds.add(albumId);
    else busyAlbumIds.delete(albumId);
    this.#publish({ ...this.#state, busyAlbumIds });
  }

  #publish(state: ImmichBrowserState): void {
    this.#state = state;
    for (const listener of this.#listeners) listener(state);
  }
}
