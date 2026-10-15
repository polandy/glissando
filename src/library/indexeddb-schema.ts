/** The library database's object stores and how each schema version upgrades to the next. */

/** Records and media share one database so a transaction can span both (see ADR-0003). */
export const LIBRARY_DATABASE_NAME = "glissando";
export const SCHEMA_VERSION = 5;
/** The version that added the `imports` store. */
const IMPORTS_ADDED_IN = 2;
/** The version that added the `focus` store (ADR-0012). */
const FOCUS_ADDED_IN = 3;
/** The version that added the `beats` store (ADR-0021). */
const BEATS_ADDED_IN = 4;
/**
 * The version whose `StoredSlideshow` records require a picture's `colours` and a picture
 * background card's `tint` (ADR-0033). There is no production instance yet, so a device on an
 * older version loses its stored slideshows rather than carrying records a newer build cannot
 * read; its media is cleaned up next by `deleteUnreferencedMedia`.
 */
const COLOURS_ADDED_IN = 5;

export const SLIDESHOWS = "slideshows";
export const PICTURES = "pictures";
export const MUSIC = "music";
export const IMPORTS = "imports";
/** A picture's focus, keyed by its media id like `pictures`. */
export const FOCUS = "focus";
/** A track's beats, keyed by its media id like `music`. */
export const BEATS = "beats";
export type StoreName =
  typeof SLIDESHOWS | typeof PICTURES | typeof MUSIC | typeof IMPORTS | typeof FOCUS | typeof BEATS;

/**
 * Adds what each version after `oldVersion` brought. Existing data stays untouched, except the
 * slideshow records a version before `COLOURS_ADDED_IN` left behind: cleared, not migrated, since
 * no production instance predates it.
 */
export function upgradeLibraryDatabase(database: IDBDatabase, oldVersion: number): void {
  if (oldVersion < 1) {
    database.createObjectStore(SLIDESHOWS, { keyPath: "id" });
    database.createObjectStore(PICTURES);
    database.createObjectStore(MUSIC);
  }
  if (oldVersion < IMPORTS_ADDED_IN) {
    database.createObjectStore(IMPORTS, { keyPath: "id" });
  }
  if (oldVersion < FOCUS_ADDED_IN) {
    database.createObjectStore(FOCUS);
  }
  if (oldVersion < BEATS_ADDED_IN) {
    database.createObjectStore(BEATS);
  }
  if (oldVersion > 0 && oldVersion < COLOURS_ADDED_IN) {
    database.deleteObjectStore(SLIDESHOWS);
    database.createObjectStore(SLIDESHOWS, { keyPath: "id" });
  }
}
