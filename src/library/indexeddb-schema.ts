/** The library database's object stores and how an older schema version is replaced. */

/** Records and media share one database so a transaction can span both (see ADR-0003). */
export const LIBRARY_DATABASE_NAME = "glissando";
export const SCHEMA_VERSION = 8;

export const SLIDESHOWS = "slideshows";
export const PICTURES = "pictures";
export const MUSIC = "music";
export const IMPORTS = "imports";
/** A picture's focus, keyed by its media id like `pictures`. */
export const FOCUS = "focus";
/** A track's beats, keyed by its media id like `music`. */
export const BEATS = "beats";
/** A video's original file, keyed by its media id (`StoredVideo.mediaId`). */
export const VIDEOS = "videos";
/** A track's measured loudness, keyed by its media id like `music`. */
export const LOUDNESS = "loudness";
export type StoreName =
  | typeof SLIDESHOWS
  | typeof PICTURES
  | typeof MUSIC
  | typeof IMPORTS
  | typeof FOCUS
  | typeof BEATS
  | typeof VIDEOS
  | typeof LOUDNESS;

/** The stores keyed by media id: a media's record in each goes when the media does. */
export const MEDIA_KEYED_STORES: readonly StoreName[] = [
  PICTURES,
  MUSIC,
  VIDEOS,
  FOCUS,
  BEATS,
  LOUDNESS,
];

/**
 * Creates the current stores. An older library is not migrated (no production instance yet):
 * every store goes, and the library starts empty.
 */
export function upgradeLibraryDatabase(database: IDBDatabase): void {
  for (const name of [...database.objectStoreNames]) {
    database.deleteObjectStore(name);
  }
  database.createObjectStore(SLIDESHOWS, { keyPath: "id" });
  database.createObjectStore(IMPORTS, { keyPath: "id" });
  for (const name of MEDIA_KEYED_STORES) {
    database.createObjectStore(name);
  }
}
