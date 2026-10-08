import { describeLibraryStoreContract } from "./library-store-contract";
import { MemoryLibraryStore } from "./memory-store";

describeLibraryStoreContract("MemoryLibraryStore", () => {
  const store = new MemoryLibraryStore();
  return Promise.resolve({
    store,
    reopen: () => Promise.resolve(store),
    close: () => Promise.resolve(),
  });
});
