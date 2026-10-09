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

    editor.setMusicTrim({ startMs: 12_000, endMs: 150_000 });

    expect(editor.slideshow.music?.trim).toEqual({ startMs: 12_000, endMs: 150_000 });
    expect((await storedMusic())?.trim).toEqual({ startMs: 12_000, endMs: 150_000 });
  });

  it("back to the whole track drops the excerpt, without an undo toast", async () => {
    const { editor, toaster, storedMusic } = await setUp(["a"], MUSIC);
    editor.setMusicTrim({ startMs: 12_000, endMs: 150_000 });

    editor.setMusicTrim(undefined);

    expect(await storedMusic()).toEqual(MUSIC);
    expect(toaster.current).toBeNull();
  });

  it("stores own fades, and back to automatic drops them", async () => {
    const { editor, storedMusic } = await setUp(["a"], MUSIC);

    editor.setMusicFadeIn(5000);
    editor.setMusicFadeOut(0);
    expect(await storedMusic()).toEqual({ ...MUSIC, fadeInMs: 5000, fadeOutMs: 0 });

    editor.setMusicFadeIn(undefined);
    editor.setMusicFadeOut(undefined);
    expect(await storedMusic()).toEqual(MUSIC);
  });
});
