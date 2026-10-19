import { describe, expect, it } from "vitest";
import type { MusicLoudness } from "../../loudness";
import type { LibraryStore } from "../stored-slideshow";
import { musicBlob, slideshow, type StoreHarness } from "./library-store-contract";

const CLEAN_UP_AT = new Date("2026-10-08T12:00:00Z");
const MEASURED: MusicLoudness = {
  blockMeanSquares: new Float32Array([0.01, 0.02]),
  hopPeaks: new Float32Array([0.5, 0.6, 0.7, 0.8, 0.9]),
};
const QUIETER: MusicLoudness = {
  blockMeanSquares: new Float32Array([0.001]),
  hopPeaks: new Float32Array([0.1, 0.2, 0.3, 0.4]),
};

/** The part of the `LibraryStore` contract that keeps a track's loudness beside its media. */
export function describeMusicLoudness(
  currentStore: () => LibraryStore,
  currentHarness: () => StoreHarness,
): void {
  describe("music loudness", () => {
    it("returns the stored loudness of a track", async () => {
      const store = currentStore();
      await store.putMusic("drums", musicBlob("drums"));
      await store.putMusic("ambient", musicBlob("ambient"));
      await store.putMusicLoudness("drums", MEASURED);
      await store.putMusicLoudness("ambient", QUIETER);

      expect(await store.musicLoudness("drums")).toEqual(MEASURED);
      expect(await store.musicLoudness("ambient")).toEqual(QUIETER);
    });

    it("has no loudness for a track not measured yet", async () => {
      const store = currentStore();
      await store.putMusic("measured", musicBlob("measured"));
      await store.putMusic("not-yet", musicBlob("not-yet"));
      await store.putMusicLoudness("measured", MEASURED);

      expect(await store.musicLoudness("measured")).toEqual(MEASURED);
      expect(await store.musicLoudness("not-yet")).toBeUndefined();
    });

    it("keeps no loudness for a track whose media is not stored", async () => {
      const store = currentStore();
      await store.putMusic("present", musicBlob("present"));
      await store.putMusicLoudness("present", MEASURED);
      await store.putMusicLoudness("gone", MEASURED);

      expect(await store.musicLoudness("present")).toEqual(MEASURED);
      expect(await store.musicLoudness("gone")).toBeUndefined();
    });

    it("keeps the loudness when the store is opened again", async () => {
      const store = currentStore();
      await store.putMusic("drums", musicBlob("drums"));
      await store.putMusicLoudness("drums", MEASURED);

      const reopened = await currentHarness().reopen();

      expect(await reopened.musicLoudness("drums")).toEqual(MEASURED);
    });

    it("deleting a slideshow removes its music's loudness, sparing music another one uses", async () => {
      const store = currentStore();
      for (const id of ["own-music", "shared-music"]) {
        await store.putMusic(id, musicBlob(id));
        await store.putMusicLoudness(id, MEASURED);
      }
      await store.saveSlideshow(
        slideshow({ songs: [{ id: "own-music", fileName: "a.mp3", durationMs: 2000, mimeType: "audio/mpeg" }] }),
      );
      await store.saveSlideshow(
        slideshow({
          id: "other",
          songs: [{ id: "shared-music", fileName: "a.mp3", durationMs: 2000, mimeType: "audio/mpeg" }],
        }),
      );
      await store.saveSlideshow(
        slideshow({
          id: "third",
          songs: [{ id: "shared-music", fileName: "a.mp3", durationMs: 2000, mimeType: "audio/mpeg" }],
        }),
      );

      await store.deleteSlideshow("show-1");
      await store.deleteSlideshow("other");

      expect(await store.musicLoudness("shared-music")).toEqual(MEASURED);
      expect(await store.musicLoudness("own-music")).toBeUndefined();
    });

    it("deleting unreferenced media removes their loudness too", async () => {
      const store = currentStore();
      for (const id of ["referenced-music", "abandoned-music"]) {
        await store.putMusic(id, musicBlob(id));
        await store.putMusicLoudness(id, MEASURED);
      }
      await store.saveSlideshow(
        slideshow({
          songs: [{ id: "referenced-music", fileName: "a.mp3", durationMs: 2000, mimeType: "audio/mpeg" }],
        }),
      );

      await store.deleteUnreferencedMedia(CLEAN_UP_AT);

      expect(await store.musicLoudness("referenced-music")).toEqual(MEASURED);
      expect(await store.musicLoudness("abandoned-music")).toBeUndefined();
    });
  });
}
