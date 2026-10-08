import { describe, expect, it } from "vitest";
import { IMPORT_SPARED_FOR_MS, MediaNotFoundError, type LibraryStore } from "../stored-slideshow";
import { musicBlob, pictureBlobs, rejection, type StoreHarness } from "./library-store-contract";

const STARTED_AT = new Date("2026-10-08T12:00:00Z");
const atMs = (ms: number): Date => new Date(STARTED_AT.getTime() + ms);

/** The part of the `LibraryStore` contract that keeps imports in progress safe across tabs. */
export function describeImportsInProgress(
  currentStore: () => LibraryStore,
  currentHarness: () => StoreHarness,
): void {
  describe("imports in progress", () => {
    async function importWithMedia(store: LibraryStore): Promise<void> {
      await store.recordImportMedia("import-1", STARTED_AT, "import-picture");
      await store.putPicture("import-picture", pictureBlobs("import"));
      await store.recordImportMedia("import-1", STARTED_AT, "import-music");
      await store.putMusic("import-music", musicBlob("import"));
    }

    it("spares the media of an import started less than a day ago", async () => {
      const store = currentStore();
      await importWithMedia(store);
      await store.putPicture("abandoned-picture", pictureBlobs("abandoned"));

      await store.deleteUnreferencedMedia(atMs(IMPORT_SPARED_FOR_MS - 1));

      expect(await (await store.pictureBlob("import-picture")).text()).toBe("import display");
      expect(await (await store.musicBlob("import-music")).text()).toBe("import music");
      expect(await rejection(store.pictureBlob("abandoned-picture"))).toBeInstanceOf(
        MediaNotFoundError,
      );
    });

    it("spares an import's media recorded by another connection to the same library", async () => {
      await importWithMedia(currentStore());
      const other = await currentHarness().reopen();

      await other.deleteUnreferencedMedia(atMs(0));

      expect(await (await other.pictureBlob("import-picture")).text()).toBe("import display");
    });

    it("deletes the media of an import started a day ago or more, and forgets the import", async () => {
      const store = currentStore();
      await importWithMedia(store);
      await store.deleteUnreferencedMedia(atMs(0));
      expect(await (await store.pictureBlob("import-picture")).text()).toBe("import display");

      await store.deleteUnreferencedMedia(atMs(IMPORT_SPARED_FOR_MS));
      await store.putPicture("import-picture", pictureBlobs("again"));
      await store.deleteUnreferencedMedia(atMs(0));

      expect(await rejection(store.pictureBlob("import-picture"))).toBeInstanceOf(
        MediaNotFoundError,
      );
      expect(await rejection(store.musicBlob("import-music"))).toBeInstanceOf(MediaNotFoundError);
    });

    it("deletes the unreferenced media of an ended import", async () => {
      const store = currentStore();
      await importWithMedia(store);
      await store.putPicture("other-picture", pictureBlobs("other"));
      await store.recordImportMedia("import-2", STARTED_AT, "other-picture");

      await store.endImport("import-1");
      await store.deleteUnreferencedMedia(atMs(0));

      expect(await (await store.pictureBlob("other-picture")).text()).toBe("other display");
      expect(await rejection(store.pictureBlob("import-picture"))).toBeInstanceOf(
        MediaNotFoundError,
      );
      expect(await rejection(store.musicBlob("import-music"))).toBeInstanceOf(MediaNotFoundError);
    });

    it("ending an unknown import is a no-op", async () => {
      await expect(currentStore().endImport("never-started")).resolves.toBeUndefined();
    });
  });
}
