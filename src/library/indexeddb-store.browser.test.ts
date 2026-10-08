import { LIBRARY_DATABASE_NAME, openLibraryStore } from "./indexeddb-store";
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
