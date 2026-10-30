import { describe, expect, it } from "vitest";
import type { StoredVideo } from "../own-video";
import type { LibraryStore } from "../library-store";
import { MediaNotFoundError } from "../library-store";
import type { StoredPicture } from "../stored-slideshow";
import {
  picture,
  pictureBlobs,
  rejection,
  slideshow,
  type StoreHarness,
} from "./library-store-contract";

const CLEAN_UP_AT = new Date("2026-10-08T12:00:00Z");
const CLAIMED_AT = new Date("2026-10-08T11:00:00Z");

const videoBlob = (label: string): Blob => new Blob([`${label} video`], { type: "video/mp4" });

function clip(id: string, mediaId: string): StoredPicture {
  const video: StoredVideo = { mediaId, sourceMs: 10_000, startMs: 0, endMs: 5000 };
  return { ...picture(id), video };
}

/** The part of the `LibraryStore` contract that keeps a video's original file. */
export function describeVideos(
  currentStore: () => LibraryStore,
  currentHarness: () => StoreHarness,
): void {
  describe("videos", () => {
    it("returns a stored video's bytes and type", async () => {
      const store = currentStore();
      await store.putVideo("video-1", videoBlob("one"));

      const blob = await store.videoBlob("video-1");

      expect(await blob.text()).toBe("one video");
      expect(blob.type).toBe("video/mp4");
    });

    it("throws MediaNotFoundError for an unknown video", async () => {
      const error = await rejection(currentStore().videoBlob("missing"));

      expect(error).toBeInstanceOf(MediaNotFoundError);
      expect((error as MediaNotFoundError).mediaId).toBe("missing");
    });

    it("keeps a video when the store is opened again", async () => {
      await currentStore().putVideo("video-1", videoBlob("one"));

      const reopened = await currentHarness().reopen();

      expect(await (await reopened.videoBlob("video-1")).text()).toBe("one video");
    });

    it("counts the video's bytes in a slideshow's media", async () => {
      const store = currentStore();
      await store.putPicture("clip", pictureBlobs("clip"));
      await store.putVideo("video-1", videoBlob("one"));

      const bytes = await store.mediaBytes(slideshow({ pictures: [clip("clip", "video-1")] }));

      expect(bytes).toBe("clip display".length + "clip thumbnail".length + "one video".length);
    });

    it("deletes a slideshow's video, sparing one another slideshow still uses", async () => {
      const store = currentStore();
      for (const id of ["a", "b"]) {
        await store.putPicture(id, pictureBlobs(id));
      }
      await store.putVideo("own-video", videoBlob("own"));
      await store.putVideo("shared-video", videoBlob("shared"));
      await store.saveSlideshow(
        slideshow({ pictures: [clip("a", "own-video"), clip("a2", "shared-video")] }),
      );
      await store.saveSlideshow(slideshow({ id: "other", pictures: [clip("b", "shared-video")] }));

      await store.deleteSlideshow("show-1");

      expect(await (await store.videoBlob("shared-video")).text()).toBe("shared video");
      expect(await rejection(store.videoBlob("own-video"))).toBeInstanceOf(MediaNotFoundError);
    });

    it("cleans up a video no slideshow references and no claim spares", async () => {
      const store = currentStore();
      await store.putVideo("kept", videoBlob("kept"));
      await store.putVideo("abandoned", videoBlob("abandoned"));
      await store.putVideo("claimed", videoBlob("claimed"));
      await store.saveSlideshow(slideshow({ pictures: [clip("a", "kept")] }));
      await store.claimMedia("import-1", CLAIMED_AT, "claimed");

      await store.deleteUnreferencedMedia(CLEAN_UP_AT);

      expect(await (await store.videoBlob("kept")).text()).toBe("kept video");
      expect(await (await store.videoBlob("claimed")).text()).toBe("claimed video");
      expect(await rejection(store.videoBlob("abandoned"))).toBeInstanceOf(MediaNotFoundError);
    });
  });
}
