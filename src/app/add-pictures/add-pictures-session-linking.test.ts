import { describe, expect, it } from "vitest";
import { picture, slideshow } from "../../library/testing/library-store-contract";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { deferredColours } from "../import/testing/deferred-colours";
import { fakeIntakePorts } from "../testing/picture-intake-ports";
import { AddPicturesSession } from "./add-pictures-session";

const SHOW = slideshow({
  pictures: [{ ...picture("old-1"), capturedAt: "2025-07-01T10:00:00Z" }],
});
const PHOTO = {
  id: "asset-1",
  fileName: "asset-1.jpg",
  takenAt: "2025-07-02T10:00:00Z",
  size: { width: 4000, height: 3000 },
};

describe("AddPicturesSession, to a server slideshow with a link pending", () => {
  it("waits for it to store the pictures, which then hold the linked photo", async () => {
    const store = new MemoryLibraryStore();
    await store.saveSlideshow(SHOW);
    const deferred = deferredColours();
    const { ports } = fakeIntakePorts(store, { immichColours: deferred.colours });
    const session = new AddPicturesSession(SHOW, "server", { ...ports, store });
    session.addImmichPhotos([PHOTO]);
    const read = await deferred.asked(PHOTO.id);

    const committing = session.commit();
    read.resolve();
    await committing;

    expect((await store.getSlideshow(SHOW.id)).pictures.map(({ id }) => id)).toEqual([
      "old-1",
      "asset-1",
    ]);
  });
});
