import { describe, expect, it } from "vitest";
import type { StoredMusic } from "../../library/stored-slideshow";
import { setUp } from "./editor-test-harness";

function song(id: string): StoredMusic {
  return { id, fileName: `${id}.mp3`, durationMs: 60_000, mimeType: "audio/mpeg" };
}

const songIds = (songs: readonly StoredMusic[]) => songs.map(({ id }) => id);

describe("SlideshowEditor, the playlist (ADR-0023)", () => {
  it("adds songs at the end and stores them at once", async () => {
    const { editor, store } = await setUp(["a"], [song("m1")]);

    editor.addSongs([song("m2"), song("m3")]);

    expect(songIds(editor.slideshow.songs)).toEqual(["m1", "m2", "m3"]);
    await editor.settled();
    expect(songIds((await store.getSlideshow("show")).songs)).toEqual(["m1", "m2", "m3"]);
  });

  it("moves a song to another place", async () => {
    const { editor } = await setUp(["a"], [song("m1"), song("m2"), song("m3")]);

    editor.moveSong("m3", 0);

    expect(songIds(editor.slideshow.songs)).toEqual(["m3", "m1", "m2"]);
  });

  it("plays the songs one after another, and crossfades them again", async () => {
    const { editor } = await setUp(["a"], [song("m1"), song("m2")]);

    editor.setBetweenSongs("sequence");
    expect(editor.slideshow.betweenSongs).toBe("sequence");

    editor.setBetweenSongs(undefined);
    expect(editor.slideshow.betweenSongs).toBeUndefined();
  });

  it("removes a song with an undo toast that puts it back at its place", async () => {
    const { editor, toaster } = await setUp(["a"], [song("m1"), song("m2"), song("m3")]);

    editor.removeSong("m2");
    expect(songIds(editor.slideshow.songs)).toEqual(["m1", "m3"]);
    expect(toaster.current?.text).toBe("Song entfernt");

    toaster.current?.action?.run();

    expect(songIds(editor.slideshow.songs)).toEqual(["m1", "m2", "m3"]);
  });

  it("spares a removed song's media from clean-up while it can be undone, not after", async () => {
    const { editor, toaster, musicSurvivesCleanUp } = await setUp(["a"], [song("m1"), song("m2")]);

    editor.removeSong("m2");
    expect(await musicSurvivesCleanUp("m1")).toBe(true);
    expect(await musicSurvivesCleanUp("m2")).toBe(true);

    toaster.dismiss();
    expect(await musicSurvivesCleanUp("m1")).toBe(true);
    expect(await musicSurvivesCleanUp("m2")).toBe(false);
  });
});
