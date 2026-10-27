import { afterEach, describe, expect, it } from "vitest";
import { details, mountScreen, unmountScreen } from "./slideshow-screen-harness";

afterEach(() => unmountScreen());

const musicTile = () => document.querySelector<HTMLButtonElement>(".tiles button.music");

describe("SlideshowScreen, the music tile", () => {
  it("names the track and its length once it differs from the slideshow's duration", () => {
    const { calls } = mountScreen(
      details(["a", "b"], { songCount: 1, musicTitle: "Sommerwind.mp3", musicSeconds: 204 }),
    );

    const tile = musicTile();
    expect(tile?.textContent?.replace(/\s+/g, " ").trim()).toBe("Musik Sommerwind.mp3 3:24 Musik");
    tile?.click();

    expect(calls.musicEdits).toBe(1);
  });

  it("names the count of several songs with the playlist's length", () => {
    mountScreen(
      details(["a", "b"], { songCount: 3, musicTitle: "Sommerwind.mp3", musicSeconds: 523 }),
    );

    expect(musicTile()?.textContent?.replace(/\s+/g, " ").trim()).toBe("Musik 3 Songs 8:43 Musik");
  });

  it("offers to add music to a slideshow without any", () => {
    const { calls } = mountScreen(details(["a", "b"]));

    const tile = musicTile();
    expect(tile?.textContent?.replace(/\s+/g, " ").trim()).toBe("Musik Keine Musik hinzufügen");
    tile?.click();

    expect(calls.musicEdits).toBe(1);
  });
});
