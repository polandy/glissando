import type { ImmichClient, ImmichPhoto } from "./immich-client";

const FIRST_PAGE = 1;

export interface DeselectionWatch {
  readonly ids: ReadonlySet<string>;
  stop(): void;
}

/**
 * The photos picked for an import, across tabs and albums, in the order they were picked; each
 * keeps its data for the import. Published with the Svelte store contract as that list.
 */
export class PhotoSelection {
  readonly #photos = new Map<string, ImmichPhoto>();
  readonly #listeners = new Set<(photos: readonly ImmichPhoto[]) => void>();
  readonly #deselectionWatches = new Set<Set<string>>();
  /** The photo last toggled on its own: where a shift-click's range starts. */
  #anchor: ImmichPhoto | null = null;

  get count(): number {
    return this.#photos.size;
  }

  has(photoId: string): boolean {
    return this.#photos.has(photoId);
  }

  photos(): readonly ImmichPhoto[] {
    return [...this.#photos.values()];
  }

  subscribe(listener: (photos: readonly ImmichPhoto[]) => void): () => void {
    this.#listeners.add(listener);
    listener(this.photos());
    return () => this.#listeners.delete(listener);
  }

  /** Collects the ids of the photos deselected from now until `stop()`. */
  watchDeselections(): DeselectionWatch {
    const ids = new Set<string>();
    this.#deselectionWatches.add(ids);
    return { ids, stop: () => this.#deselectionWatches.delete(ids) };
  }

  toggle(photo: ImmichPhoto): void {
    if (this.#photos.delete(photo.id)) this.#noteDeselected([photo.id]);
    else this.#photos.set(photo.id, photo);
    this.#anchor = photo;
    this.#publish();
  }

  /**
   * A shift-click: gives every photo of `shown` from the anchor to `photo` the anchor's state, as
   * file managers and Immich do. The anchor stays, so another shift-click re-aims from it. Without
   * an anchor among `shown` it is a plain toggle.
   */
  extendTo(photo: ImmichPhoto, shown: readonly ImmichPhoto[]): void {
    const from = this.#anchor === null ? -1 : shown.findIndex(({ id }) => id === this.#anchor?.id);
    const to = shown.findIndex(({ id }) => id === photo.id);
    if (this.#anchor === null || from < 0 || to < 0) {
      this.toggle(photo);
      return;
    }
    const range = from <= to ? shown.slice(from, to + 1) : shown.slice(to, from + 1).reverse();
    if (this.has(this.#anchor.id)) this.selectAll(range);
    else this.deselectAll(range);
  }

  selectAll(photos: readonly ImmichPhoto[]): void {
    const missing = photos.filter(({ id }) => !this.#photos.has(id));
    for (const photo of missing) this.#photos.set(photo.id, photo);
    if (missing.length > 0) this.#publish();
  }

  deselectAll(photos: readonly ImmichPhoto[]): void {
    const removed = photos.filter(({ id }) => this.#photos.delete(id));
    this.#noteDeselected(removed.map(({ id }) => id));
    if (removed.length > 0) this.#publish();
  }

  clear(): void {
    this.#anchor = null;
    if (this.#photos.size === 0) return;
    this.#noteDeselected([...this.#photos.keys()]);
    this.#photos.clear();
    this.#publish();
  }

  #noteDeselected(photoIds: readonly string[]): void {
    for (const watch of this.#deselectionWatches) for (const id of photoIds) watch.add(id);
  }

  #publish(): void {
    const photos = this.photos();
    for (const listener of this.#listeners) listener(photos);
  }
}

/** Every photo of an album, newest first, fetched page by page. */
export async function allAlbumPhotos(
  client: ImmichClient,
  albumId: string,
): Promise<ImmichPhoto[]> {
  const photos: ImmichPhoto[] = [];
  let page: number | null = FIRST_PAGE;
  while (page !== null) {
    const answer = await client.photos({ page, albumId });
    photos.push(...answer.photos);
    page = answer.nextPage;
  }
  return photos;
}
