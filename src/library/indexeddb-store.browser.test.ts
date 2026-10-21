import { describe, expect, it } from "vitest";
import { SlideshowNotFoundError, type StoredSlideshow } from "./stored-slideshow";
import { storedFocus } from "./focus-pass-fixtures";
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
  /** A library as schema version 1 left it: slideshows and media, no imports store. */
  function openVersionOneWithSlideshow(slideshow: StoredSlideshow): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(LIBRARY_DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        database.createObjectStore("slideshows", { keyPath: "id" }).put(slideshow);
        database.createObjectStore("pictures");
        database.createObjectStore("music");
      };
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error ?? new Error("opening version 1 failed"));
    });
  }

  it("clears the slideshows of a version 1 library, predating colours, and records imports after upgrading", async () => {
    await deleteLibraryDatabase();
    const saved: StoredSlideshow = {
      id: "show-1",
      title: "July 2025",
      createdAt: "2025-07-02T08:00:00Z",
      pictures: [
        {
          id: "saved-picture",
          capturedAt: "2025-07-01T10:00:00Z",
          width: 1,
          height: 1,
          fileName: "a.jpg",
          colours: { veil: "#404040", accent: "#C0C0C0" },
        },
      ],
      songs: [],
      secondsPerPicture: 5,
    };
    await openVersionOneWithSlideshow(saved);

    const store = await openLibraryStore(indexedDB);
    try {
      await expect(store.getSlideshow("show-1")).rejects.toBeInstanceOf(SlideshowNotFoundError);
      expect(await store.listSlideshows()).toEqual([]);
      await store.claimMedia("import-1", new Date("2026-10-08T12:00:00Z"), "picture-1");
      await store.putPicture("picture-1", { display: new Blob(["d"]), thumbnail: new Blob(["t"]) });
      await store.deleteUnreferencedMedia(new Date("2026-10-08T12:00:00Z"));
      expect(await (await store.pictureBlob("picture-1")).text()).toBe("d");
    } finally {
      store.close();
      await deleteLibraryDatabase();
    }
  });
});

describe("IndexedDbLibraryStore focus upgrade", () => {
  /** A library as schema version 2 left it: a slideshow with its picture, no focus store. */
  function openVersionTwoWithSlideshow(slideshow: StoredSlideshow): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(LIBRARY_DATABASE_NAME, 2);
      request.onupgradeneeded = () => {
        const database = request.result;
        database.createObjectStore("slideshows", { keyPath: "id" }).put(slideshow);
        database.createObjectStore("pictures").put(
          {
            display: { bytes: new ArrayBuffer(1), type: "image/jpeg" },
            thumbnail: { bytes: new ArrayBuffer(1), type: "image/jpeg" },
          },
          "saved-picture",
        );
        database.createObjectStore("music");
        database.createObjectStore("imports", { keyPath: "id" });
      };
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error ?? new Error("opening version 2 failed"));
    });
  }

  it("clears a version 2 library's slideshows, predating colours, keeps pictures and stores focus after upgrading", async () => {
    await deleteLibraryDatabase();
    const saved: StoredSlideshow = {
      id: "show-1",
      title: "July 2025",
      createdAt: "2025-07-02T08:00:00Z",
      pictures: [
        {
          id: "saved-picture",
          capturedAt: "2025-07-01T10:00:00Z",
          width: 1,
          height: 1,
          fileName: "a.jpg",
          colours: { veil: "#404040", accent: "#C0C0C0" },
        },
      ],
      songs: [],
      secondsPerPicture: 5,
    };
    await openVersionTwoWithSlideshow(saved);

    const store = await openLibraryStore(indexedDB);
    try {
      await expect(store.getSlideshow("show-1")).rejects.toBeInstanceOf(SlideshowNotFoundError);
      expect((await store.thumbnailBlob("saved-picture")).size).toBe(1);
      expect(await store.pictureFocus(["saved-picture"])).toEqual(new Map());
      await store.putPictureFocus("saved-picture", storedFocus({ kind: "none" }));
      expect(await store.pictureFocus(["saved-picture"])).toEqual(
        new Map([["saved-picture", storedFocus({ kind: "none" })]]),
      );
    } finally {
      store.close();
      await deleteLibraryDatabase();
    }
  });
});

describe("IndexedDbLibraryStore beats upgrade", () => {
  /** A library as schema version 3 left it: a slideshow with its music, no beats store. */
  function openVersionThreeWithSlideshow(slideshow: StoredSlideshow): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(LIBRARY_DATABASE_NAME, 3);
      request.onupgradeneeded = () => {
        const database = request.result;
        database.createObjectStore("slideshows", { keyPath: "id" }).put(slideshow);
        database.createObjectStore("pictures");
        database
          .createObjectStore("music")
          .put({ bytes: new ArrayBuffer(1), type: "audio/mpeg" }, "saved-music");
        database.createObjectStore("imports", { keyPath: "id" });
        database.createObjectStore("focus");
      };
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error ?? new Error("opening version 3 failed"));
    });
  }

  it("clears a version 3 library's slideshows, predating colours, keeps music and stores beats after upgrading", async () => {
    await deleteLibraryDatabase();
    const saved: StoredSlideshow = {
      id: "show-1",
      title: "July 2025",
      createdAt: "2025-07-02T08:00:00Z",
      pictures: [],
      songs: [{ id: "saved-music", fileName: "a.mp3", durationMs: 1000, mimeType: "audio/mpeg" }],
      secondsPerPicture: 5,
    };
    await openVersionThreeWithSlideshow(saved);

    const store = await openLibraryStore(indexedDB);
    try {
      await expect(store.getSlideshow("show-1")).rejects.toBeInstanceOf(SlideshowNotFoundError);
      expect((await store.musicBlob("saved-music")).size).toBe(1);
      expect(await store.musicBeats("saved-music")).toBeUndefined();
      await store.putMusicBeats("saved-music", { kind: "none" });
      expect(await store.musicBeats("saved-music")).toEqual({ kind: "none" });
      expect(await store.musicLoudness("saved-music")).toBeUndefined();
      const loudness = {
        blockMeanSquares: new Float32Array([0.01, 0.02]),
        hopPeaks: new Float32Array([0.5, 0.6, 0.7, 0.8, 0.9]),
      };
      await store.putMusicLoudness("saved-music", loudness);
      expect(await store.musicLoudness("saved-music")).toEqual(loudness);
    } finally {
      store.close();
      await deleteLibraryDatabase();
    }
  });
});
