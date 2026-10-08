import { afterEach, describe, expect, it } from "vitest";
import {
  LIBRARY_DATABASE_NAME,
  openLibraryStore,
  type IndexedDbLibraryStore,
} from "../library/indexeddb-store";
import { checkGlissandoFile } from "./check-glissando-file";
import { EXPORTED_SLIDESHOW, MODIFIED_AT } from "./testing/glissando-fixtures";
import { exportSlideshow } from "./export-slideshow";
import { writeGlissandoFile } from "./write-glissando-file";

let store: IndexedDbLibraryStore | null = null;

function deleteLibraryDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(LIBRARY_DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("deleting the database failed"));
  });
}

afterEach(async () => {
  store?.close();
  store = null;
  await deleteLibraryDatabase();
});

describe("a .glissando file between two libraries", () => {
  it("opens a slideshow exported from IndexedDB as an equal copy with its own ids", async () => {
    await deleteLibraryDatabase();
    store = await openLibraryStore(indexedDB);
    const jpeg = (content: string) => new Blob([content], { type: "image/jpeg" });
    await store.putPicture("src-p1", {
      display: jpeg("display one"),
      thumbnail: jpeg("thumb one"),
    });
    await store.putPicture("src-p2", {
      display: jpeg("display two"),
      thumbnail: jpeg("thumb two"),
    });
    await store.putMusic("src-m1", new Blob(["music bytes"], { type: "audio/mp4" }));
    await store.saveSlideshow(EXPORTED_SLIDESHOW);

    const exported = await exportSlideshow(EXPORTED_SLIDESHOW, store, { modifiedAt: MODIFIED_AT });
    const file = new File([exported], "Herbst in Wien.glissando");
    const check = await checkGlissandoFile(file, { freeBytes: () => Promise.resolve(null) });
    if (check.kind !== "ok") {
      throw new Error(`the export should pass the check, got ${check.kind}`);
    }
    let next = 0;
    const created = await writeGlissandoFile(
      check.contents,
      { store, newId: () => `copy-${++next}`, now: () => MODIFIED_AT, log: () => undefined },
      { existingTitles: [EXPORTED_SLIDESHOW.title], signal: new AbortController().signal },
    );

    const copy = await store.getSlideshow(created.id);
    expect(copy.title).toBe("Herbst in Wien (2)");
    const [first] = copy.pictures;
    expect(first && (await (await store.pictureBlob(first.id)).text())).toBe("display two");
    expect(first && (await store.thumbnailBlob(first.id)).type).toBe("image/jpeg");
    expect(await store.mediaBytes(copy)).toBe(await store.mediaBytes(EXPORTED_SLIDESHOW));
  });
});
