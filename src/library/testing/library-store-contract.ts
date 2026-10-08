import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MediaNotFoundError,
  SlideshowNotFoundError,
  type LibraryStore,
  type StoredPicture,
  type StoredSlideshow,
} from "../stored-slideshow";
import { describeImportsInProgress } from "./imports-in-progress-contract";

const CLEAN_UP_AT = new Date("2026-10-08T12:00:00Z");

/** A store under test, freshly emptied, and how to open it again over the same data. */
export interface StoreHarness {
  readonly store: LibraryStore;
  reopen(): Promise<LibraryStore>;
  close(): Promise<void>;
}

function picture(id: string): StoredPicture {
  return {
    id,
    capturedAt: "2025-07-01T10:00:00Z",
    width: 3240,
    height: 2160,
    fileName: `${id}.jpg`,
  };
}

function slideshow(overrides: Partial<StoredSlideshow> = {}): StoredSlideshow {
  return {
    id: "show-1",
    title: "July 2025",
    createdAt: "2025-07-02T08:00:00Z",
    pictures: [picture("picture-1")],
    secondsPerPicture: 5,
    ...overrides,
  };
}

export function pictureBlobs(label: string): { display: Blob; thumbnail: Blob } {
  return {
    display: new Blob([`${label} display`], { type: "image/jpeg" }),
    thumbnail: new Blob([`${label} thumbnail`], { type: "image/jpeg" }),
  };
}

export const musicBlob = (label: string): Blob =>
  new Blob([`${label} music`], { type: "audio/mpeg" });

export async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected the promise to reject");
}

/** The `LibraryStore` contract every implementation passes, written once. */
export function describeLibraryStoreContract(
  name: string,
  openEmpty: () => Promise<StoreHarness>,
): void {
  describe(`${name} fulfils the LibraryStore contract`, () => {
    let harness: StoreHarness;
    let store: LibraryStore;
    beforeEach(async () => {
      harness = await openEmpty();
      store = harness.store;
    });
    afterEach(() => harness.close());

    it("lists no slideshows when empty", async () => {
      expect(await store.listSlideshows()).toEqual([]);
    });

    it("returns a saved slideshow by id", async () => {
      const saved = slideshow({
        music: {
          id: "music-1",
          fileName: "summer.mp3",
          durationMs: 180_000,
          mimeType: "audio/mpeg",
        },
      });
      await store.saveSlideshow(saved);

      expect(await store.getSlideshow("show-1")).toEqual(saved);
    });

    it("replaces a slideshow saved again under the same id", async () => {
      await store.saveSlideshow(slideshow({ title: "First" }));
      await store.saveSlideshow(slideshow({ title: "Second" }));

      expect(await store.listSlideshows()).toEqual([slideshow({ title: "Second" })]);
    });

    it("lists slideshows newest first", async () => {
      const older = slideshow({ id: "older", createdAt: "2025-07-01T08:00:00Z" });
      const newest = slideshow({ id: "newest", createdAt: "2025-09-01T08:00:00Z" });
      const middle = slideshow({ id: "middle", createdAt: "2025-08-01T08:00:00Z" });
      for (const saved of [older, newest, middle]) {
        await store.saveSlideshow(saved);
      }

      expect((await store.listSlideshows()).map((listed) => listed.id)).toEqual([
        "newest",
        "middle",
        "older",
      ]);
    });

    it("throws SlideshowNotFoundError for an unknown slideshow id", async () => {
      const error = await rejection(store.getSlideshow("missing"));

      expect(error).toBeInstanceOf(SlideshowNotFoundError);
      expect((error as SlideshowNotFoundError).slideshowId).toBe("missing");
    });

    it("returns a picture's display and thumbnail renditions", async () => {
      await store.putPicture("picture-1", pictureBlobs("one"));

      expect(await (await store.pictureBlob("picture-1")).text()).toBe("one display");
      expect(await (await store.thumbnailBlob("picture-1")).text()).toBe("one thumbnail");
    });

    it("returns stored music", async () => {
      await store.putMusic("music-1", musicBlob("one"));

      expect(await (await store.musicBlob("music-1")).text()).toBe("one music");
    });

    it.each([
      ["pictureBlob", (s: LibraryStore) => s.pictureBlob("missing")],
      ["thumbnailBlob", (s: LibraryStore) => s.thumbnailBlob("missing")],
      ["musicBlob", (s: LibraryStore) => s.musicBlob("missing")],
    ])("%s throws MediaNotFoundError for an unknown media id", async (_, read) => {
      const error = await rejection(read(store));

      expect(error).toBeInstanceOf(MediaNotFoundError);
      expect((error as MediaNotFoundError).mediaId).toBe("missing");
    });

    it("keeps slideshows and media when the store is opened again", async () => {
      await store.putPicture("picture-1", pictureBlobs("one"));
      await store.putMusic("music-1", musicBlob("one"));
      const saved = slideshow({
        music: {
          id: "music-1",
          fileName: "summer.mp3",
          durationMs: 180_000,
          mimeType: "audio/mpeg",
        },
      });
      await store.saveSlideshow(saved);

      const reopened = await harness.reopen();

      expect(await reopened.getSlideshow("show-1")).toEqual(saved);
      expect(await (await reopened.pictureBlob("picture-1")).text()).toBe("one display");
      expect(await (await reopened.thumbnailBlob("picture-1")).text()).toBe("one thumbnail");
      expect(await (await reopened.musicBlob("music-1")).text()).toBe("one music");
    });

    it("deletes media no saved slideshow references and no import in progress claims", async () => {
      await store.putPicture("referenced-picture", pictureBlobs("referenced"));
      await store.putPicture("abandoned-picture", pictureBlobs("abandoned"));
      await store.putMusic("referenced-music", musicBlob("referenced"));
      await store.putMusic("abandoned-music", musicBlob("abandoned"));
      await store.saveSlideshow(
        slideshow({
          pictures: [picture("referenced-picture")],
          music: {
            id: "referenced-music",
            fileName: "summer.mp3",
            durationMs: 180_000,
            mimeType: "audio/mpeg",
          },
        }),
      );

      await store.deleteUnreferencedMedia(CLEAN_UP_AT);

      expect(await (await store.pictureBlob("referenced-picture")).text()).toBe(
        "referenced display",
      );
      expect(await (await store.musicBlob("referenced-music")).text()).toBe("referenced music");
      expect(await rejection(store.pictureBlob("abandoned-picture"))).toBeInstanceOf(
        MediaNotFoundError,
      );
      expect(await rejection(store.thumbnailBlob("abandoned-picture"))).toBeInstanceOf(
        MediaNotFoundError,
      );
      expect(await rejection(store.musicBlob("abandoned-music"))).toBeInstanceOf(
        MediaNotFoundError,
      );
    });

    describeImportsInProgress(
      () => store,
      () => harness,
    );
  });
}
