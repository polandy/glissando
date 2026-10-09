import { describe, expect, it } from "vitest";
import type { PictureFocus } from "../picture-focus";
import type { LibraryStore } from "../stored-slideshow";
import { picture, pictureBlobs, slideshow, type StoreHarness } from "./library-store-contract";

const CLEAN_UP_AT = new Date("2026-10-08T12:00:00Z");
const FACES: PictureFocus = {
  kind: "subject",
  box: { x: 0.25, y: 0.1, width: 0.3, height: 0.4 },
};
const NOTHING: PictureFocus = { kind: "none" };

/** The part of the `LibraryStore` contract that keeps a picture's focus beside its media. */
export function describePictureFocus(
  currentStore: () => LibraryStore,
  currentHarness: () => StoreHarness,
): void {
  describe("picture focus", () => {
    it("returns the stored focus of each picture asked for, a subject or none", async () => {
      const store = currentStore();
      await store.putPicture("faces", pictureBlobs("faces"));
      await store.putPicture("landscape", pictureBlobs("landscape"));
      await store.putPictureFocus("faces", FACES);
      await store.putPictureFocus("landscape", NOTHING);

      const focus = await store.pictureFocus(["faces", "landscape"]);

      expect(focus).toEqual(
        new Map([
          ["faces", FACES],
          ["landscape", NOTHING],
        ]),
      );
    });

    it("leaves out a picture not looked at yet", async () => {
      const store = currentStore();
      await store.putPicture("looked-at", pictureBlobs("looked-at"));
      await store.putPicture("not-yet", pictureBlobs("not-yet"));
      await store.putPictureFocus("looked-at", NOTHING);

      const focus = await store.pictureFocus(["looked-at", "not-yet"]);

      expect(focus.get("looked-at")).toEqual(NOTHING);
      expect(focus.has("not-yet")).toBe(false);
    });

    it("keeps no focus for a picture whose media is not stored", async () => {
      const store = currentStore();
      await store.putPicture("present", pictureBlobs("present"));
      await store.putPictureFocus("present", FACES);
      await store.putPictureFocus("gone", FACES);

      const focus = await store.pictureFocus(["present", "gone"]);

      expect(focus.get("present")).toEqual(FACES);
      expect(focus.has("gone")).toBe(false);
    });

    it("keeps the focus when the store is opened again", async () => {
      const store = currentStore();
      await store.putPicture("faces", pictureBlobs("faces"));
      await store.putPictureFocus("faces", FACES);

      const reopened = await currentHarness().reopen();

      expect(await reopened.pictureFocus(["faces"])).toEqual(new Map([["faces", FACES]]));
    });

    it("deleting a slideshow removes its pictures' focus, sparing a picture another one uses", async () => {
      const store = currentStore();
      for (const id of ["own-picture", "shared-picture"]) {
        await store.putPicture(id, pictureBlobs(id));
        await store.putPictureFocus(id, FACES);
      }
      await store.saveSlideshow(
        slideshow({ pictures: [picture("own-picture"), picture("shared-picture")] }),
      );
      await store.saveSlideshow(slideshow({ id: "other", pictures: [picture("shared-picture")] }));

      await store.deleteSlideshow("show-1");

      const focus = await store.pictureFocus(["own-picture", "shared-picture"]);
      expect(focus.get("shared-picture")).toEqual(FACES);
      expect(focus.has("own-picture")).toBe(false);
    });

    it("deleting unreferenced media removes their focus too", async () => {
      const store = currentStore();
      for (const id of ["referenced-picture", "abandoned-picture"]) {
        await store.putPicture(id, pictureBlobs(id));
        await store.putPictureFocus(id, NOTHING);
      }
      await store.saveSlideshow(slideshow({ pictures: [picture("referenced-picture")] }));

      await store.deleteUnreferencedMedia(CLEAN_UP_AT);

      const focus = await store.pictureFocus(["referenced-picture", "abandoned-picture"]);
      expect(focus.get("referenced-picture")).toEqual(NOTHING);
      expect(focus.has("abandoned-picture")).toBe(false);
    });
  });
}
