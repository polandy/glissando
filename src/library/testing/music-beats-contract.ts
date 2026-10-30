import { describe, expect, it } from "vitest";
import type { MusicBeats } from "../../beats";
import type { LibraryStore } from "../library-store";
import type { StoredMusic } from "../stored-slideshow";
import { musicBlob, slideshow, type StoreHarness } from "./library-store-contract";

const CLEAN_UP_AT = new Date("2026-10-08T12:00:00Z");
const ON_THE_BEAT: MusicBeats = { kind: "beats", beatsMs: [500, 1000, 1500], beatsPerMinute: 120 };
const NO_CLEAR_BEAT: MusicBeats = { kind: "none" };

function music(id: string): StoredMusic {
  return { id, fileName: `${id}.mp3`, durationMs: 2000, mimeType: "audio/mpeg" };
}

/** The part of the `LibraryStore` contract that keeps a track's beats beside its media. */
export function describeMusicBeats(
  currentStore: () => LibraryStore,
  currentHarness: () => StoreHarness,
): void {
  describe("music beats", () => {
    it("returns the stored beats of a track, beats found or none", async () => {
      const store = currentStore();
      await store.putMusic("drums", musicBlob("drums"));
      await store.putMusic("ambient", musicBlob("ambient"));
      await store.putMusicBeats("drums", ON_THE_BEAT);
      await store.putMusicBeats("ambient", NO_CLEAR_BEAT);

      expect(await store.musicBeats("drums")).toEqual(ON_THE_BEAT);
      expect(await store.musicBeats("ambient")).toEqual(NO_CLEAR_BEAT);
    });

    it("has nothing for a track not listened to yet", async () => {
      const store = currentStore();
      await store.putMusic("listened", musicBlob("listened"));
      await store.putMusic("not-yet", musicBlob("not-yet"));
      await store.putMusicBeats("listened", NO_CLEAR_BEAT);

      expect(await store.musicBeats("listened")).toEqual(NO_CLEAR_BEAT);
      expect(await store.musicBeats("not-yet")).toBeUndefined();
    });

    it("keeps no beats for a track whose media is not stored", async () => {
      const store = currentStore();
      await store.putMusic("present", musicBlob("present"));
      await store.putMusicBeats("present", ON_THE_BEAT);
      await store.putMusicBeats("gone", ON_THE_BEAT);

      expect(await store.musicBeats("present")).toEqual(ON_THE_BEAT);
      expect(await store.musicBeats("gone")).toBeUndefined();
    });

    it("keeps the beats when the store is opened again", async () => {
      const store = currentStore();
      await store.putMusic("drums", musicBlob("drums"));
      await store.putMusicBeats("drums", ON_THE_BEAT);

      const reopened = await currentHarness().reopen();

      expect(await reopened.musicBeats("drums")).toEqual(ON_THE_BEAT);
    });

    it("deleting a slideshow removes its music's beats, sparing music another one uses", async () => {
      const store = currentStore();
      for (const id of ["own-music", "shared-music"]) {
        await store.putMusic(id, musicBlob(id));
        await store.putMusicBeats(id, ON_THE_BEAT);
      }
      await store.saveSlideshow(slideshow({ songs: [music("own-music")] }));
      await store.saveSlideshow(slideshow({ id: "other", songs: [music("shared-music")] }));
      await store.saveSlideshow(slideshow({ id: "third", songs: [music("shared-music")] }));

      await store.deleteSlideshow("show-1");
      await store.deleteSlideshow("other");

      expect(await store.musicBeats("shared-music")).toEqual(ON_THE_BEAT);
      expect(await store.musicBeats("own-music")).toBeUndefined();
    });

    it("deleting unreferenced media removes their beats too", async () => {
      const store = currentStore();
      for (const id of ["referenced-music", "abandoned-music"]) {
        await store.putMusic(id, musicBlob(id));
        await store.putMusicBeats(id, NO_CLEAR_BEAT);
      }
      await store.saveSlideshow(slideshow({ songs: [music("referenced-music")] }));

      await store.deleteUnreferencedMedia(CLEAN_UP_AT);

      expect(await store.musicBeats("referenced-music")).toEqual(NO_CLEAR_BEAT);
      expect(await store.musicBeats("abandoned-music")).toBeUndefined();
    });
  });
}
