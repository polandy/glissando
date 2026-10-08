import { describe, expect, it } from "vitest";
import { MediaNotFoundError, SlideshowNotFoundError, type LibraryStore } from "../stored-slideshow";
import { picture, pictureBlobs, rejection, slideshow } from "./library-store-contract";

const EDITED_AT = new Date("2026-10-08T12:00:00Z");

/** The part of the `LibraryStore` contract the slideshow editor relies on. */
export function describeEditing(currentStore: () => LibraryStore): void {
  describe("editing", () => {
    it("updates a stored slideshow in place", async () => {
      const store = currentStore();
      await store.saveSlideshow(slideshow({ title: "July 2025" }));

      await store.updateSlideshow(slideshow({ title: "Summer at the lake" }));

      expect(await store.listSlideshows()).toEqual([slideshow({ title: "Summer at the lake" })]);
    });

    it("throws SlideshowNotFoundError when updating a deleted slideshow, and does not bring it back", async () => {
      const store = currentStore();
      await store.saveSlideshow(slideshow({ id: "kept", createdAt: "2025-07-01T08:00:00Z" }));
      await store.saveSlideshow(slideshow());
      await store.deleteSlideshow("show-1");

      const error = await rejection(store.updateSlideshow(slideshow({ title: "Edited" })));

      expect(error).toBeInstanceOf(SlideshowNotFoundError);
      expect((await store.listSlideshows()).map((listed) => listed.id)).toEqual(["kept"]);
    });

    it("spares a removed picture's media while the removal claims it, and deletes it once released", async () => {
      const store = currentStore();
      await store.putPicture("kept-picture", pictureBlobs("kept"));
      await store.putPicture("removed-picture", pictureBlobs("removed"));
      await store.saveSlideshow(
        slideshow({ pictures: [picture("kept-picture"), picture("removed-picture")] }),
      );

      await store.claimMedia("removal-1", EDITED_AT, "removed-picture");
      await store.updateSlideshow(slideshow({ pictures: [picture("kept-picture")] }));
      await store.deleteUnreferencedMedia(EDITED_AT);

      expect(await (await store.pictureBlob("kept-picture")).text()).toBe("kept display");
      expect(await (await store.pictureBlob("removed-picture")).text()).toBe("removed display");

      await store.releaseClaim("removal-1");
      await store.deleteUnreferencedMedia(EDITED_AT);

      expect(await (await store.pictureBlob("kept-picture")).text()).toBe("kept display");
      expect(await rejection(store.pictureBlob("removed-picture"))).toBeInstanceOf(
        MediaNotFoundError,
      );
    });
  });
}
