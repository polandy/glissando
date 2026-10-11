import type {
  ServerMusic,
  ServerPicture,
  ServerSlideshow,
} from "../src/server-library/server-document";

/**
 * The slideshow as a share link's recipient gets it (`dev-docs/SHARE_LINK.md`, The HTTP API):
 * pictures and songs are addressed by their position, so no Immich asset id, music id or file
 * name leaves the server, and no exact capture date either.
 */

export type SharePicture = Omit<ServerPicture, "immichAssetId" | "fileName">;
export type ShareSong = Omit<ServerMusic, "musicId" | "fileName">;

export interface ShareSlideshow extends Omit<ServerSlideshow, "pictures" | "songs"> {
  readonly pictures: readonly SharePicture[];
  readonly songs: readonly ShareSong[];
}

export function shareDocumentOf(slideshow: ServerSlideshow): ShareSlideshow {
  return {
    ...slideshow,
    pictures: slideshow.pictures.map((picture) => ({
      ...without(picture, PICTURE_NAMES),
      capturedAt: firstDayOfMonth(picture.capturedAt),
    })),
    songs: slideshow.songs.map((song) => without(song, SONG_NAMES)),
  };
}

const PICTURE_NAMES = ["immichAssetId", "fileName"] as const;
const SONG_NAMES = ["musicId", "fileName"] as const;

/** `value` without the keys `names`; a key added to the format later is shared unless named. */
function without<Value extends object, Name extends keyof Value>(
  value: Value,
  names: readonly Name[],
): Omit<Value, Name> {
  const removed: ReadonlySet<PropertyKey> = new Set(names);
  return Object.fromEntries(Object.entries(value).filter(([key]) => !removed.has(key))) as Omit<
    Value,
    Name
  >;
}

/** Keeps the title fallback's month and year (COMPOSITION.md, Title), not the day or time. */
function firstDayOfMonth(dateTime: string): string {
  const instant = new Date(dateTime);
  return new Date(Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), 1)).toISOString();
}
