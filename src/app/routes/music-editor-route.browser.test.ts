import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { PICKED_SONG_MS } from "../music-editor/testing/song-intake-device";
import { TWO_SONGS, WITHOUT_MUSIC, mountRoute, unmountRoute } from "./music-editor-route-harness";

/** Picks `file` in the editor's file input, as the browser reports a pick. */
function pick(target: HTMLElement, file: File): void {
  const input = target.ownerDocument.querySelector<HTMLInputElement>('input[type="file"]');
  if (input === null) throw new Error("no file input");
  const picked = new DataTransfer();
  picked.items.add(file);
  input.files = picked.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

afterEach(() => unmountRoute());

describe("the music editor route", () => {
  it("loads the stored track's audio for listening", async () => {
    const { loaded } = await mountRoute();

    expect(await (await loaded(0)).text()).toBe("music bytes");
  });

  it("listens to the stored track from the excerpt's start", async () => {
    const { target, music, urls, loaded } = await mountRoute();
    await loaded(0);

    target.querySelector<HTMLButtonElement>(".listen-btn")?.click();

    expect(urls.created).toEqual(["blob:music"]);
    expect(music.calls).toEqual(["play@12"]);
  });

  it("stores a fade picked", async () => {
    const { target, store, editor } = await mountRoute();

    const fadeIn = target.querySelector('[role="radiogroup"][aria-labelledby="music-fade-in"]');
    fadeIn?.querySelectorAll("button")[2]?.click();
    await editor.settled();

    expect((await store.getSlideshow("show")).songs[0]?.fadeInMs).toBe(5000);
  });

  it("lets go of the track's audio and address when left", async () => {
    const { music, urls, loaded } = await mountRoute();
    await loaded(0);

    unmountRoute();

    expect(music.calls.at(-1)).toBe("dispose");
    expect(urls.revoked).toEqual(["blob:music"]);
  });

  it("offers to add a song to a slideshow without music, staying open", async () => {
    const { target, backs } = await mountRoute(WITHOUT_MUSIC);

    expect(target.querySelector(".empty")?.textContent).toContain("Noch keine Musik");
    expect(backs()).toBe(0);
  });

  it("stores a picked song in the playlist and shows it", async () => {
    const { target, store, editor, errors } = await mountRoute(WITHOUT_MUSIC);

    pick(target, new File(["ID3 tune"], "Low Tide.mp3", { type: "audio/mpeg" }));
    await editor.songsAdded;
    await editor.settled();

    expect(errors).toEqual([]);
    expect((await store.getSlideshow("show")).songs).toEqual([
      {
        id: "song-1",
        fileName: "Low Tide.mp3",
        durationMs: PICKED_SONG_MS,
        mimeType: "audio/mpeg",
      },
    ]);
  });

  it("loads the audio of the song selected in the list", async () => {
    const { target, loaded, store } = await mountRoute(TWO_SONGS);
    await store.putMusic("m2", new Blob(["second song"], { type: "audio/mpeg" }));
    await loaded(0);

    target.querySelectorAll<HTMLButtonElement>(".song .pick")[1]?.click();
    flushSync();
    const blob = await loaded(1);

    expect(await blob.text()).toBe("second song");
    expect(target.querySelector(".song-heading")?.textContent?.trim()).toBe(
      "Song 2 · Low Tide.mp3",
    );
  });

  it("keeps comparing a song's loudness when another is tapped while listening at volume", async () => {
    const { target, music, loaded, store } = await mountRoute(TWO_SONGS);
    await store.putMusic("m2", new Blob(["second song"], { type: "audio/mpeg" }));
    await loaded(0);

    target
      .querySelector<HTMLButtonElement>('[aria-labelledby="music-volume"] .listen-btn')
      ?.click();
    expect(music.calls.filter((call) => call.startsWith("play@")).length).toBe(1);

    target.querySelectorAll<HTMLButtonElement>(".song .pick")[1]?.click();
    flushSync();
    await loaded(1);

    expect(music.calls.filter((call) => call.startsWith("play@")).length).toBe(2);
  });
});
