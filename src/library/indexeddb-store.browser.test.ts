import { describe, expect, it } from "vitest";
import { IndexedDbLibraryStore, LIBRARY_DATABASE_NAME, openLibraryStore } from "./indexeddb-store";
import { describeLibraryStoreContract } from "./testing/library-store-contract";
import { MemoryLibraryStore } from "./testing/memory-store";

function deleteLibraryDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(LIBRARY_DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("deleting the database failed"));
  });
}

describeLibraryStoreContract("IndexedDbLibraryStore", async () => {
  await deleteLibraryDatabase();
  const store = await openLibraryStore(indexedDB);
  const opened = [store];
  return {
    store,
    async reopen() {
      for (const store of opened) {
        store.close();
      }
      const reopened = await openLibraryStore(indexedDB);
      opened.push(reopened);
      return reopened;
    },
    close() {
      for (const store of opened) {
        store.close();
      }
      return deleteLibraryDatabase();
    },
  };
});

describeLibraryStoreContract("MemoryLibraryStore", () => {
  const store = new MemoryLibraryStore();
  return Promise.resolve({
    store,
    reopen: () => Promise.resolve(store),
    close: () => Promise.resolve(),
  });
});

/** The real library database, recording every transaction a store opens on it. */
async function recordingDatabase(): Promise<{
  readonly database: IDBDatabase;
  readonly transactions: IDBTransaction[];
}> {
  (await openLibraryStore(indexedDB)).close();
  const database = (await new Promise((resolve, reject) => {
    const request = indexedDB.open(LIBRARY_DATABASE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("opening the database failed"));
  })) as IDBDatabase;
  const transactions: IDBTransaction[] = [];
  const recording = new Proxy(database, {
    get(target, property) {
      if (property === "transaction") {
        return (...args: Parameters<IDBDatabase["transaction"]>) => {
          const transaction = target.transaction(...args);
          transactions.push(transaction);
          return transaction;
        };
      }
      const value: unknown = Reflect.get(target, property, target);
      return typeof value === "function" ? (value as () => unknown).bind(target) : value;
    },
    set: (target, property, value) => Reflect.set(target, property, value, target),
  });
  return { database: recording, transactions };
}

describe("IndexedDbLibraryStore saves", () => {
  it("commits a slideshow save before returning, so a reload right after cannot abort it", async () => {
    await deleteLibraryDatabase();
    const { database, transactions } = await recordingDatabase();
    const store = new IndexedDbLibraryStore(database);
    try {
      const saved = store.saveSlideshow({
        id: "show-1",
        title: "Sommer am See",
        createdAt: "2025-07-02T08:00:00Z",
        pictures: [
          {
            id: "picture-1",
            capturedAt: "2025-07-01T10:00:00Z",
            width: 1,
            height: 1,
            fileName: "a.jpg",
            colours: { veil: "#404040", accent: "#C0C0C0" },
          },
        ],
        songs: [],
        secondsPerPicture: 5,
      });

      // A committing transaction is finished for new requests, even within the task that opened it.
      const save = transactions.at(-1);
      expect(() => save?.objectStore("slideshows").get("show-1")).toThrow(
        expect.objectContaining({ name: "InvalidStateError" }),
      );
      await saved;
      expect((await store.getSlideshow("show-1")).title).toBe("Sommer am See");
    } finally {
      store.close();
      await deleteLibraryDatabase();
    }
  });
});

describe("IndexedDbLibraryStore schema upgrade", () => {
  /** A library as schema version 3 left it, with records, and a store the current schema lacks. */
  function openVersionThreeWithRecords(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(LIBRARY_DATABASE_NAME, 3);
      request.onupgradeneeded = () => {
        const database = request.result;
        database.createObjectStore("slideshows", { keyPath: "id" }).put({ id: "show-1" });
        database.createObjectStore("pictures").put({ display: "d" }, "saved-picture");
        database.createObjectStore("music").put({ bytes: "m" }, "saved-music");
        database.createObjectStore("imports", { keyPath: "id" }).put({ id: "import-1" });
        database.createObjectStore("focus").put({ kind: "none" }, "saved-picture");
        database.createObjectStore("retired").put("r", "retired-1");
      };
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error ?? new Error("opening version 3 failed"));
    });
  }

  /** Each store of the library database at its current version, with its record count. */
  function storeCounts(): Promise<Record<string, number>> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(LIBRARY_DATABASE_NAME);
      request.onerror = () => reject(request.error ?? new Error("opening the database failed"));
      request.onsuccess = () => {
        const database = request.result;
        const names = [...database.objectStoreNames];
        const transaction = database.transaction(names, "readonly");
        const counts: Record<string, number> = {};
        for (const name of names) {
          const count = transaction.objectStore(name).count();
          count.onsuccess = () => (counts[name] = count.result);
        }
        transaction.oncomplete = () => {
          database.close();
          resolve(counts);
        };
        transaction.onerror = () => reject(transaction.error ?? new Error("counting failed"));
      };
    });
  }

  it("drops every store of an older library and creates the current set, empty", async () => {
    await deleteLibraryDatabase();
    await openVersionThreeWithRecords();

    (await openLibraryStore(indexedDB)).close();
    try {
      expect(await storeCounts()).toEqual({
        slideshows: 0,
        pictures: 0,
        music: 0,
        imports: 0,
        focus: 0,
        beats: 0,
        videos: 0,
        loudness: 0,
      });
    } finally {
      await deleteLibraryDatabase();
    }
  });
});
