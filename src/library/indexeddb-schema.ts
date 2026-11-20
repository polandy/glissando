/** The library database's object stores and how an older schema version migrates (ADR-0059). */

/** Records and media share one database so a transaction can span both (see ADR-0003). */
export const LIBRARY_DATABASE_NAME = "glissando";

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

/** Rewrites a library one schema version up, inside the upgrade's transaction. */
export type SchemaStep = (transaction: IDBTransaction) => void;

/** A schema history: `steps[i]` takes version `oldest + i` to `oldest + i + 1`. */
export interface SchemaChain {
  readonly oldest: number;
  readonly steps: readonly SchemaStep[];
}

/** The oldest library an upgrade migrates; raising it needs an owner decision (ADR-0059). */
export const OLDEST_MIGRATABLE_SCHEMA_VERSION = 8;
const LIBRARY_SCHEMA_CHAIN: SchemaChain = { oldest: OLDEST_MIGRATABLE_SCHEMA_VERSION, steps: [] };
export const SCHEMA_VERSION = LIBRARY_SCHEMA_CHAIN.oldest + LIBRARY_SCHEMA_CHAIN.steps.length;

/** A library older than the oldest version the chain migrates; it is left as it was. */
export class UnmigratableLibraryError extends Error {
  constructor(version: number, oldest: number) {
    super(
      `The library database is at schema version ${version}; Glissando migrates ${oldest} and ` +
        `newer only, so it left the database untouched. Export what you need from an older ` +
        `Glissando, or delete the "${LIBRARY_DATABASE_NAME}" database in the browser.`,
    );
    this.name = "UnmigratableLibraryError";
  }
}

/**
 * Brings a library from `oldVersion` (0: none yet) to the chain's version, in `upgradeneeded`.
 * A new library gets the current stores at once, so each step must leave exactly that shape.
 */
export function upgradeLibraryDatabase(
  transaction: IDBTransaction,
  oldVersion: number,
  chain: SchemaChain = LIBRARY_SCHEMA_CHAIN,
): void {
  if (oldVersion === 0) {
    createLibraryStores(transaction.db);
    return;
  }
  if (oldVersion < chain.oldest) {
    throw new UnmigratableLibraryError(oldVersion, chain.oldest);
  }
  for (const step of chain.steps.slice(oldVersion - chain.oldest)) {
    step(transaction);
  }
}

function createLibraryStores(database: IDBDatabase): void {
  database.createObjectStore(SLIDESHOWS, { keyPath: "id" });
  database.createObjectStore(IMPORTS, { keyPath: "id" });
  for (const name of MEDIA_KEYED_STORES) {
    database.createObjectStore(name);
  }
}
