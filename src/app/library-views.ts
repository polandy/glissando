import { slideshowDurationMs } from "../compose";
import { MILLISECONDS_PER_SECOND } from "../player";
import type { StoredSlideshow } from "../library/stored-slideshow";
import type { SlideshowDetails, SlideshowSummary } from "./screens/view-models";

/** A start card's cover shows the first pictures in play order, one large and two small. */
export const COVER_PICTURE_COUNT = 3;

/** Resolves a picture id to its thumbnail's object URL. */
export type ThumbnailUrl = (pictureId: string) => string;

function coverId(stored: StoredSlideshow): string {
  const cover = stored.pictures[0];
  if (cover === undefined) {
    throw new Error(`slideshow "${stored.id}" has no pictures; a slideshow needs at least one`);
  }
  return cover.id;
}

export function slideshowSummary(
  stored: StoredSlideshow,
  thumbnailUrl: ThumbnailUrl,
): SlideshowSummary {
  return {
    id: stored.id,
    title: stored.title,
    coverUrls: stored.pictures
      .slice(0, COVER_PICTURE_COUNT)
      .map((picture) => thumbnailUrl(picture.id)),
    pictureCount: stored.pictures.length,
    durationSeconds: slideshowDurationMs(stored) / MILLISECONDS_PER_SECOND,
    hasMusic: stored.music !== undefined,
  };
}

export function slideshowDetails(
  stored: StoredSlideshow,
  thumbnailUrl: ThumbnailUrl,
): SlideshowDetails {
  return {
    title: stored.title,
    coverUrl: thumbnailUrl(coverId(stored)),
    durationSeconds: slideshowDurationMs(stored) / MILLISECONDS_PER_SECOND,
    musicTitle: stored.music?.fileName ?? null,
    pictures: stored.pictures.map((picture) => ({
      id: picture.id,
      thumbnailUrl: thumbnailUrl(picture.id),
      capturedAt: picture.capturedAt,
    })),
  };
}
