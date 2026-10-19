import { describe, expect, it } from "vitest";
import type { StoredMusic } from "../../library/stored-slideshow";
import { setUp } from "./editor-test-harness";

const MUSIC: StoredMusic = {
  id: "m1",
  fileName: "Sommerwind.mp3",
  durationMs: 204_000,
  mimeType: "audio/mpeg",
};

describe("SlideshowEditor, the music's excerpt and fades", () => {
  it("stores the excerpt at once", async () => {
    const { editor, storedMusic } = await setUp(["a"], MUSIC);

    editor.setMusicTrim("m1", { startMs: 12_000, endMs: 150_000 });

    expect(editor.slideshow.songs[0]?.trim).toEqual({ startMs: 12_000, endMs: 150_000 });
    expect((await storedMusic())?.trim).toEqual({ startMs: 12_000, endMs: 150_000 });
  });

  it("back to the whole track drops the excerpt, without an undo toast", async () => {
    const { editor, toaster, storedMusic } = await setUp(["a"], MUSIC);
    editor.setMusicTrim("m1", { startMs: 12_000, endMs: 150_000 });

    editor.setMusicTrim("m1", undefined);

    expect(await storedMusic()).toEqual(MUSIC);
    expect(toaster.current).toBeNull();
  });

  it("stores own fades, and back to automatic drops them", async () => {
    const { editor, storedMusic } = await setUp(["a"], MUSIC);

    editor.setMusicFadeIn("m1", 5000);
    editor.setMusicFadeOut("m1", 0);
    expect(await storedMusic()).toEqual({ ...MUSIC, fadeInMs: 5000, fadeOutMs: 0 });

    editor.setMusicFadeIn("m1", undefined);
    editor.setMusicFadeOut("m1", undefined);
    expect(await storedMusic()).toEqual(MUSIC);
  });

  it("stores the song's own volume, and back to levelled drops it", async () => {
    const { editor, storedMusic } = await setUp(["a"], MUSIC);

    editor.setMusicVolume("m1", -3);
    expect(editor.slideshow.songs[0]?.volumeDb).toBe(-3);
    expect((await storedMusic())?.volumeDb).toBe(-3);

    editor.setMusicVolume("m1", undefined);
    expect(await storedMusic()).toEqual(MUSIC);
  });
});

describe("SlideshowEditor, the music's picture changes", () => {
  it("stores even picture changes at once, and back on the beat drops them", async () => {
    const { editor, storedMusic } = await setUp(["a"], MUSIC);

    editor.setMusicPictureChanges("m1", "even");
    expect(editor.slideshow.songs[0]?.pictureChanges).toBe("even");
    expect(await storedMusic()).toEqual({ ...MUSIC, pictureChanges: "even" });

    editor.setMusicPictureChanges("m1", undefined);
    expect(await storedMusic()).toEqual(MUSIC);
  });
});

describe("SlideshowEditor, the pictures' length with music", () => {
  it("stores the pictures lasting their own seconds, and filling the music again drops it", async () => {
    const { editor, store } = await setUp(["a"], MUSIC);
    const stored = async () => {
      await editor.settled();
      return store.getSlideshow("show");
    };

    editor.setPictureLength("seconds");
    expect(editor.slideshow.pictureLength).toBe("seconds");
    expect((await stored()).pictureLength).toBe("seconds");

    editor.setPictureLength(undefined);
    expect(await stored()).not.toHaveProperty("pictureLength");
  });

  it("stores how long each picture stays", async () => {
    const { editor, store } = await setUp(["a"], MUSIC);

    editor.setSecondsPerPicture(7.5);
    await editor.settled();

    expect((await store.getSlideshow("show")).secondsPerPicture).toBe(7.5);
  });
});
