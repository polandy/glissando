import { describe, expect, it } from "vitest";
import { storedFocus } from "../library/focus-pass-fixtures";
import type { PictureFocus } from "../library/picture-focus";
import { linkedPicture, serverSlideshow, serverStoreHarness } from "./testing/server-store-harness";

const FACES: PictureFocus = {
  kind: "subject",
  box: { x: 0.1, y: 0.1, width: 0.2, height: 0.3 },
  foundBy: "face",
};
const SCENERY: PictureFocus = { kind: "scenery" };

describe("ServerSlideshowStore picture focus (ADR-0041)", () => {
  it("knows no focus for a picture whose slideshow it has not read yet", async () => {
    const { store, seed } = serverStoreHarness();
    await seed(serverSlideshow({ pictures: [linkedPicture("asset-1")] }));

    expect(await store.pictureFocus(["asset-1"])).toEqual(new Map());
    await expect(store.putPictureFocus("asset-1", storedFocus(FACES))).rejects.toThrow(
      /not of any slideshow/,
    );
  });

  it("PUTs a focus to the server once its slideshow has been read, not just kept in the session", async () => {
    const { store, client, seed } = serverStoreHarness();
    const slideshow = await seed(serverSlideshow({ pictures: [linkedPicture("asset-1")] }));
    await store.listSlideshows();

    await store.putPictureFocus("asset-1", storedFocus(FACES));

    expect(await store.pictureFocus(["asset-1"])).toEqual(
      new Map([["asset-1", storedFocus(FACES)]]),
    );
    expect(await client.slideshowFocus(slideshow.id)).toEqual(
      new Map([["asset-1", storedFocus(FACES)]]),
    );
  });

  it("learns a newly saved picture's slideshow from updateSlideshowWith, not only from a read", async () => {
    const { store, seed } = serverStoreHarness();
    const slideshow = await seed(serverSlideshow({ pictures: [linkedPicture("asset-1")] }));
    await store.listSlideshows();

    await store.updateSlideshowWith(slideshow.id, (current) => ({
      ...current,
      pictures: [linkedPicture("asset-2")],
    }));

    await expect(store.putPictureFocus("asset-2", storedFocus(SCENERY))).resolves.toBeUndefined();
    expect(await store.pictureFocus(["asset-2"])).toEqual(
      new Map([["asset-2", storedFocus(SCENERY)]]),
    );
  });

  it("keeps an unreachable PUT's result for the UI, but not for the pass, until the server confirms it", async () => {
    const { store, control, seed } = serverStoreHarness();
    await seed(serverSlideshow({ pictures: [linkedPicture("asset-1")] }));
    await store.listSlideshows();

    control.down = true;
    await store.putPictureFocus("asset-1", storedFocus(FACES));
    control.down = false;

    expect(await store.pictureFocus(["asset-1"])).toEqual(
      new Map([["asset-1", storedFocus(FACES)]]),
    );
    expect(await store.pictureFocusForPass(["asset-1"])).toEqual(new Map());
  });
});
