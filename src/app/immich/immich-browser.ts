import {
  browseFailureOf,
  UNEXPECTED_FAILURE,
  type BrowseFailure,
  type ReportUnavailable,
} from "../../immich/browse-failure";
import type {
  ImmichAlbum,
  ImmichClient,
  ImmichPerson,
  ImmichPhoto,
  PhotoSource,
  TimelineMonth,
} from "../../immich/immich-client";
import { PhotoFeed } from "../../immich/photo-feed";
import { allSourcePhotos, PhotoSelection } from "../../immich/photo-selection";
import { monthEnd } from "../../immich/timeline";
import { photoSourceOf, sourceKey, type BrowseSource } from "./browse-source";
import { NOTHING_ALREADY_IN, type AlreadyIn, type SourceMembership } from "./immich-view";
import { NOT_LOADED, ToolList, type ToolListState } from "./tool-list";

export type BrowserTab = "photos" | "albums" | "people" | "folders";

export interface ImmichBrowserState {
  readonly tab: BrowserTab;
  /** Null until the albums have arrived. */
  readonly albums: readonly ImmichAlbum[] | null;
  /** Why the last album request failed, or null; `retryAlbums()` asks again. */
  readonly albumsFailure: BrowseFailure | null;
  readonly months: ToolListState<TimelineMonth>;
  readonly people: ToolListState<ImmichPerson>;
  readonly folderPaths: ToolListState<string>;
  /** The folder the Folders tab is in; null at the top. */
  readonly folderPath: string | null;
  /** All pictures restricted to favourites. */
  readonly favourites: boolean;
  /** The month All pictures was jumped to (`YYYY-MM`), or null for the newest. */
  readonly month: string | null;
  /** Sources (by `sourceKey`) whose photos are being fetched to select them all. */
  readonly busySources: ReadonlySet<string>;
  /** Why a source's last whole-source select failed; its next toggle tries again. */
  readonly sourceFailures: ReadonlyMap<string, BrowseFailure>;
  /** What is known of each source's photos, for its badge and the footer's "from k sources". */
  readonly membership: ReadonlyMap<string, SourceMembership>;
}

export interface ImmichBrowserOptions {
  readonly client: ImmichClient;
  readonly reportUnavailable: ReportUnavailable;
  /** Videos are listed and can be picked: a device slideshow downloads them. */
  readonly withVideos?: boolean;
}

/** One import's Immich selection, tab, lists and feeds, kept across visits (Svelte store). */
export class ImmichBrowser {
  readonly selection = new PhotoSelection();
  readonly #client: ImmichClient;
  readonly #reportUnavailable: ReportUnavailable;
  readonly #withVideos: boolean;
  readonly #listeners = new Set<(state: ImmichBrowserState) => void>();
  readonly #libraryFeeds = new Map<string, PhotoFeed>();
  readonly #sourceFeeds = new Map<string, PhotoFeed>();
  readonly #sourcePhotos = new Map<string, Map<string, ImmichPhoto>>();
  readonly #completeSources = new Set<string>();
  readonly #albumList: ToolList<ImmichAlbum>;
  readonly #monthList: ToolList<TimelineMonth>;
  readonly #peopleList: ToolList<ImmichPerson>;
  readonly #folderList: ToolList<string>;
  #state: ImmichBrowserState = {
    tab: "photos",
    albums: null,
    albumsFailure: null,
    months: NOT_LOADED,
    people: NOT_LOADED,
    folderPaths: NOT_LOADED,
    folderPath: null,
    favourites: false,
    month: null,
    busySources: new Set(),
    sourceFailures: new Map(),
    membership: new Map(),
  };

  constructor(options: ImmichBrowserOptions) {
    this.#client = options.client;
    this.#reportUnavailable = options.reportUnavailable;
    this.#withVideos = options.withVideos === true;
    const list = <T>(
      fetch: () => Promise<readonly T[]>,
      optional: boolean,
      onChange: (state: ToolListState<T>) => void,
    ) => new ToolList<T>({ fetch, optional, onChange, reportUnavailable: this.#reportUnavailable });
    this.#albumList = list(
      () => this.#client.albums(),
      false,
      ({ items, failure }) => this.#merge({ albums: items, albumsFailure: failure }),
    );
    this.#monthList = list(
      () => this.#client.timelineMonths(),
      true,
      (months) => this.#merge({ months }),
    );
    this.#peopleList = list(
      () => this.#client.people(),
      true,
      (people) => this.#merge({ people }),
    );
    this.#folderList = list(
      () => this.#client.folderPaths(),
      true,
      (folderPaths) => this.#merge({ folderPaths }),
    );
  }

  get state(): ImmichBrowserState {
    return this.#state;
  }

  /** The feed of All pictures for the favourites and month now chosen, kept per combination. */
  get library(): PhotoFeed {
    const { favourites, month } = this.#state;
    const key = JSON.stringify([favourites, month]);
    let feed = this.#libraryFeeds.get(key);
    if (feed === undefined) {
      const source: PhotoSource = {
        kind: "library",
        favoritesOnly: favourites,
        takenBefore: month === null ? null : monthEnd(month),
      };
      feed = this.#newFeed(source);
      this.#libraryFeeds.set(key, feed);
    }
    return feed;
  }

  subscribe(listener: (state: ImmichBrowserState) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  }

  showTab(tab: BrowserTab): void {
    this.#merge({ tab });
  }

  setFavourites(favourites: boolean): void {
    this.#merge({ favourites });
  }

  /** Restarts All pictures at the end of `month` (`YYYY-MM`); null goes back to the newest. */
  jumpToMonth(month: string | null): void {
    this.#merge({ month });
  }

  openFolder(folderPath: string | null): void {
    this.#merge({ folderPath });
  }

  loadAlbums = (): Promise<void> => this.#albumList.load();
  retryAlbums = (): Promise<void> => this.#albumList.retry();
  loadMonths = (): Promise<void> => this.#monthList.load();
  retryMonths = (): Promise<void> => this.#monthList.retry();
  loadPeople = (): Promise<void> => this.#peopleList.load();
  retryPeople = (): Promise<void> => this.#peopleList.retry();
  loadFolders = (): Promise<void> => this.#folderList.load();
  retryFolders = (): Promise<void> => this.#folderList.retry();

  /** The source's own feed, the same one on every visit. */
  sourceFeed(source: BrowseSource): PhotoFeed {
    const key = sourceKey(source);
    let feed = this.#sourceFeeds.get(key);
    if (feed === undefined) {
      feed = this.#newFeed(photoSourceOf(source));
      this.#sourceFeeds.set(key, feed);
      feed.subscribe(({ photos, done }) => this.#learn(key, photos, done));
    }
    return feed;
  }

  /** Selects the whole source, or deselects it when all is selected; ignored while busy. */
  async toggleSource(
    source: BrowseSource,
    alreadyIn: AlreadyIn = NOTHING_ALREADY_IN,
  ): Promise<void> {
    const key = sourceKey(source);
    if (this.#state.busySources.has(key)) return;
    const known = this.#sourcePhotos.get(key);
    if (this.#completeSources.has(key) && known !== undefined) {
      const photos = [...known.values()].filter((photo) => !alreadyIn(photo));
      if (photos.every(({ id }) => this.selection.has(id))) {
        this.selection.deselectAll(photos);
      } else {
        this.selection.selectAll(photos);
      }
      return;
    }
    this.#setBusy(key, true);
    this.#setSourceFailure(key, null);
    const deselected = this.selection.watchDeselections();
    try {
      const photos = await allSourcePhotos(this.#client, photoSourceOf(source), this.#withVideos);
      this.#learn(key, photos, true);
      this.selection.selectAll(
        photos.filter((photo) => !deselected.ids.has(photo.id) && !alreadyIn(photo)),
      );
    } catch (error) {
      const failure = browseFailureOf(error, this.#reportUnavailable);
      this.#setSourceFailure(key, failure);
      if (failure === UNEXPECTED_FAILURE) throw error;
    } finally {
      deselected.stop();
      this.#setBusy(key, false);
    }
  }

  #newFeed(source: PhotoSource): PhotoFeed {
    return new PhotoFeed({
      client: this.#client,
      reportUnavailable: this.#reportUnavailable,
      source,
      withVideos: this.#withVideos,
    });
  }

  #learn(key: string, photos: readonly ImmichPhoto[], complete: boolean): void {
    const known = this.#sourcePhotos.get(key) ?? new Map<string, ImmichPhoto>();
    const before = known.size;
    for (const photo of photos) known.set(photo.id, photo);
    this.#sourcePhotos.set(key, known);
    const wasComplete = this.#completeSources.has(key);
    if (complete) this.#completeSources.add(key);
    if (known.size === before && wasComplete === this.#completeSources.has(key)) return;
    const membership = new Map(this.#state.membership);
    membership.set(key, { photos: new Map(known), complete: this.#completeSources.has(key) });
    this.#merge({ membership });
  }

  #setSourceFailure(key: string, failure: BrowseFailure | null): void {
    if (failure === null && !this.#state.sourceFailures.has(key)) return;
    const sourceFailures = new Map(this.#state.sourceFailures);
    if (failure === null) sourceFailures.delete(key);
    else sourceFailures.set(key, failure);
    this.#merge({ sourceFailures });
  }

  #setBusy(key: string, busy: boolean): void {
    const busySources = new Set(this.#state.busySources);
    if (busy) busySources.add(key);
    else busySources.delete(key);
    this.#merge({ busySources });
  }

  /** Publishes the state with `change` applied, unless it changes nothing. */
  #merge(change: Partial<ImmichBrowserState>): void {
    const unchanged = Object.entries(change).every(
      ([name, value]) => this.#state[name as keyof ImmichBrowserState] === value,
    );
    if (unchanged) return;
    this.#state = { ...this.#state, ...change };
    for (const listener of this.#listeners) listener(this.#state);
  }
}
