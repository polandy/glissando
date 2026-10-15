import type {
  ServerMusic,
  ServerPicture,
  ServerSlideshow,
} from "../src/server-library/server-document";

/**
 * The slideshow as a share link's recipient gets it (`dev-docs/share_link/HTTP_API.md`):
 * only the keys named here are shared, so a field added to the format stays on the server until
 * it is named. Pictures and songs are addressed by their position, so no Immich asset id, music
 * id or file name leaves the server, and no exact date either.
 */

const SHARED_SLIDESHOW_KEYS = [
  "title",
  "createdAt",
  "secondsPerPicture",
  "ownOrder",
  "betweenSongs",
  "transition",
  "pictureLength",
  "portraitPictures",
  "openingCard",
  "closingCard",
] as const satisfies readonly (keyof ServerSlideshow)[];
const SHARED_PICTURE_KEYS = [
  "capturedAt",
  "width",
  "height",
  "kenBurns",
  "caption",
  "durationMs",
  "transition",
  "alone",
  "colours",
] as const satisfies readonly (keyof ServerPicture)[];
const SHARED_SONG_KEYS = [
  "durationMs",
  "mimeType",
  "trim",
  "fadeInMs",
  "fadeOutMs",
  "pictureChanges",
] as const satisfies readonly (keyof ServerMusic)[];

export type SharePicture = Pick<ServerPicture, (typeof SHARED_PICTURE_KEYS)[number]>;
export type ShareSong = Pick<ServerMusic, (typeof SHARED_SONG_KEYS)[number]>;

export interface ShareSlideshow extends Pick<
  ServerSlideshow,
  (typeof SHARED_SLIDESHOW_KEYS)[number]
> {
  readonly pictures: readonly SharePicture[];
  readonly songs: readonly ShareSong[];
}

export function shareDocumentOf(slideshow: ServerSlideshow): ShareSlideshow {
  return {
    ...only(slideshow, SHARED_SLIDESHOW_KEYS),
    createdAt: firstDayOfMonth(slideshow.createdAt),
    pictures: slideshow.pictures.map((picture) => ({
      ...only(picture, SHARED_PICTURE_KEYS),
      capturedAt: firstDayOfMonth(picture.capturedAt),
    })),
    songs: slideshow.songs.map((song) => only(song, SHARED_SONG_KEYS)),
  };
}

/** `value` with only the keys `names` it has; an optional key it lacks stays absent. */
function only<Value extends object, Name extends keyof Value>(
  value: Value,
  names: readonly Name[],
): Pick<Value, Name> {
  const kept: ReadonlySet<PropertyKey> = new Set(names);
  return Object.fromEntries(Object.entries(value).filter(([key]) => kept.has(key))) as Pick<
    Value,
    Name
  >;
}

/** Keeps the title fallback's month and year (COMPOSITION.md, Title), not the day or time. */
function firstDayOfMonth(dateTime: string): string {
  const instant = new Date(dateTime);
  return new Date(Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), 1)).toISOString();
}
