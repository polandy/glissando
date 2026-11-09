import { requestResult } from "./indexeddb-records";
import { LIBRARY_DATABASE_NAME, SCHEMA_VERSION, upgradeLibraryDatabase } from "./indexeddb-schema";
import { IndexedDbLibraryStore } from "./indexeddb-store";

export interface LibraryOpenHooks {
  /** Another tab upgraded the schema; this store's connection is already closed. */
  readonly onNewerVersion: () => void;
  /** Another tab's connection still holds the old schema while this open waits to upgrade it. */
  readonly onBlocked: () => void;
}

/** True for the error of opening a library that a newer schema version already upgraded. */
export function isNewerVersionError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "VersionError";
}

/** Opens (and creates or upgrades) the library database. */
export function openLibraryStore(
  indexedDB: IDBFactory,
  hooks: LibraryOpenHooks = { onNewerVersion: () => undefined, onBlocked: () => undefined },
): Promise<IndexedDbLibraryStore> {
  const request = indexedDB.open(LIBRARY_DATABASE_NAME, SCHEMA_VERSION);
  request.onupgradeneeded = () => upgradeLibraryDatabase(request.result);
  request.onblocked = hooks.onBlocked;
  return requestResult(request).then(
    () => new IndexedDbLibraryStore(request.result, hooks.onNewerVersion),
  );
}
