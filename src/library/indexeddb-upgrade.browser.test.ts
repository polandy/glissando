import { describe, expect, it } from "vitest";
import { openLibraryStore } from "./indexeddb-open";
import {
  LIBRARY_DATABASE_NAME,
  OLDEST_MIGRATABLE_SCHEMA_VERSION,
  SCHEMA_VERSION,
  type SchemaChain,
  UnmigratableLibraryError,
  upgradeLibraryDatabase,
} from "./indexeddb-schema";

function deleteLibraryDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(LIBRARY_DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("deleting the database failed"));
  });
}

/** Opens the library database at `version`, running `upgrade` if that version is new to it. */
function openAt(
  version: number | undefined,
  upgrade: (transaction: IDBTransaction, oldVersion: number) => void = () => undefined,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LIBRARY_DATABASE_NAME, version);
    request.onupgradeneeded = (event) => {
      if (request.transaction !== null) upgrade(request.transaction, event.oldVersion);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("opening the database failed"));
  });
}

function putAll(database: IDBDatabase, records: Record<string, [unknown, string?][]>) {
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(Object.keys(records), "readwrite");
    for (const [store, values] of Object.entries(records)) {
      for (const [value, key] of values) transaction.objectStore(store).put(value, key);
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("writing failed"));
  });
}

function getAll(database: IDBDatabase, store: string): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const request = database.transaction(store, "readonly").objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("reading failed"));
  });
}

/** A library at the current schema version, holding a slideshow and its picture. */
async function currentLibraryWithRecords(): Promise<void> {
  await deleteLibraryDatabase();
  (await openLibraryStore(indexedDB)).close();
  const database = await openAt(SCHEMA_VERSION);
  await putAll(database, {
    slideshows: [[{ id: "show-1", title: "Sommer am See" }]],
    pictures: [[{ display: "d" }, "picture-1"]],
  });
  database.close();
}

/** A step that records its `name` in `ran` and marks every slideshow record with it. */
function markSlideshows(name: string, ran: string[]) {
  return (transaction: IDBTransaction) => {
    ran.push(name);
    const cursorRequest = transaction.objectStore("slideshows").openCursor();
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (cursor === null) return;
      cursor.update({ ...(cursor.value as object), mark: name });
      cursor.continue();
    };
  };
}

describe("upgradeLibraryDatabase", () => {
  it("runs only the steps after a library's version and keeps every record", async () => {
    await currentLibraryWithRecords();
    const ran: string[] = [];
    const chain: SchemaChain = {
      oldest: SCHEMA_VERSION - 1,
      steps: [markSlideshows("to current", ran), markSlideshows("to next", ran)],
    };

    const database = await openAt(SCHEMA_VERSION + 1, (transaction, oldVersion) =>
      upgradeLibraryDatabase(transaction, oldVersion, chain),
    );
    try {
      expect(ran).toEqual(["to next"]);
      expect(await getAll(database, "slideshows")).toEqual([
        { id: "show-1", title: "Sommer am See", mark: "to next" },
      ]);
      expect(await getAll(database, "pictures")).toEqual([{ display: "d" }]);
    } finally {
      database.close();
      await deleteLibraryDatabase();
    }
  });
});

describe("openLibraryStore on a library too old to migrate", () => {
  it("refuses a library older than the oldest migratable version and leaves it as it was", async () => {
    const tooOld = OLDEST_MIGRATABLE_SCHEMA_VERSION - 1;
    await deleteLibraryDatabase();
    const old = await openAt(tooOld, (transaction) => {
      transaction.db.createObjectStore("slideshows", { keyPath: "id" }).put({ id: "show-1" });
    });
    old.close();

    const error: unknown = await openLibraryStore(indexedDB).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(UnmigratableLibraryError);
    expect(String(error)).toContain(`schema version ${tooOld}`);

    const kept = await openAt(undefined);
    try {
      expect(kept.version).toBe(tooOld);
      expect(await getAll(kept, "slideshows")).toEqual([{ id: "show-1" }]);
    } finally {
      kept.close();
      await deleteLibraryDatabase();
    }
  });
});
