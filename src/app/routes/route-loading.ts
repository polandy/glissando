import type { LibraryStore } from "../../library/library-store";
import { SlideshowNotFoundError } from "../../library/library-store";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { COVER_PICTURE_COUNT, slideshowDetails, slideshowSummary } from "../library-views";
import type { ObjectUrls } from "../media/object-urls";
import type { SlideshowDetails, SlideshowSummary } from "../screens/view-models";

type ThumbnailUrls = Pick<ObjectUrls, "sync" | "settled" | "get">;

/**
 * A screen's data loads resolve to null once `left` aborted: the screen unmounted meanwhile and
 * disposed its thumbnail URLs, which must not be touched again.
 */
export async function loadStartSlideshows(
  store: Pick<LibraryStore, "listSlideshows">,
  covers: ThumbnailUrls,
  left: AbortSignal,
): Promise<readonly SlideshowSummary[] | null> {
  const stored = await store.listSlideshows();
  if (left.aborted) {
    return null;
  }
  covers.sync(
    stored.flatMap((slideshow) =>
      slideshow.pictures.slice(0, COVER_PICTURE_COUNT).map(({ id }) => id),
    ),
  );
  await covers.settled();
  if (left.aborted) {
    return null;
  }
  return stored.map((slideshow) => slideshowSummary(slideshow, (id) => covers.get(id) ?? ""));
}

/**
 * See `loadStartSlideshows`; rejects with `SlideshowNotFoundError` for an unknown id while the
 * screen is still shown — once it left, there is nowhere to go back from.
 */
export async function loadSlideshowScreen(
  store: Pick<LibraryStore, "getSlideshow">,
  slideshowId: string,
  thumbnails: ThumbnailUrls,
  left: AbortSignal,
): Promise<{ readonly stored: StoredSlideshow; readonly details: SlideshowDetails } | null> {
  let stored: StoredSlideshow;
  try {
    stored = await store.getSlideshow(slideshowId);
  } catch (error) {
    if (left.aborted && error instanceof SlideshowNotFoundError) {
      return null;
    }
    throw error;
  }
  if (left.aborted) {
    return null;
  }
  thumbnails.sync(stored.pictures.map((picture) => picture.id));
  await thumbnails.settled();
  if (left.aborted) {
    return null;
  }
  return { stored, details: slideshowDetails(stored, (id) => thumbnails.get(id) ?? "") };
}

/**
 * Each song's object URL for one playing, by music id, read when the player opens; none without
 * music. Resolves to null once `closed` aborted, having opened no URL that nobody would revoke.
 */
export async function loadPlayerMusic(
  store: Pick<LibraryStore, "musicBlob">,
  stored: StoredSlideshow,
  createUrl: (blob: Blob) => string,
  closed: AbortSignal,
): Promise<{ readonly urls: ReadonlyMap<string, string> } | null> {
  const blobs = await Promise.all(
    stored.songs.map(async ({ id }) => [id, await store.musicBlob(id)] as const),
  );
  if (closed.aborted) {
    return null;
  }
  return { urls: new Map(blobs.map(([id, blob]) => [id, createUrl(blob)])) };
}
