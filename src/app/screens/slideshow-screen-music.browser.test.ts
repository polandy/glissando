import { afterEach, describe, expect, it } from "vitest";
import { details, mountScreen, unmountScreen } from "./slideshow-screen-harness";
import type { SlideshowDetails } from "./view-models";

afterEach(() => unmountScreen());

const withMusic = (musicSummary: SlideshowDetails["musicSummary"]) =>
  details(["a", "b"], { musicTitle: "Sommerwind.mp3", musicSeconds: 204, musicSummary });

const musicRow = () => document.querySelector<HTMLButtonElement>(".rows button.music");

describe("SlideshowScreen, the music row", () => {
  it("opens the music editor, naming the track and that it plays whole", () => {
    const { calls } = mountScreen(withMusic({ excerpt: null, fades: null }));

    const row = musicRow();
    expect(row?.textContent?.replace(/\s+/g, " ").trim()).toBe(
      "Musik Sommerwind.mp3 ganzer Titel Bearbeiten",
    );
    row?.click();

    expect(calls.musicEdits).toBe(1);
  });

  it("sums up an excerpt with its fades", () => {
    mountScreen(withMusic({ excerpt: { fromSeconds: 12, toSeconds: 150 }, fades: "in-and-out" }));

    expect(musicRow()?.querySelector("small")?.textContent).toBe("0:12–2:30 · blendet ein und aus");
  });

  it("names only the fades when the whole track plays", () => {
    mountScreen(withMusic({ excerpt: null, fades: "out" }));

    expect(musicRow()?.querySelector("small")?.textContent).toBe("blendet aus");
  });

  it("stays a plain fact without music, offering nothing to edit", () => {
    mountScreen(details(["a", "b"]));

    expect(document.querySelector(".rows")?.textContent).toContain("Ohne Musik");
    expect(musicRow()).toBeNull();
  });
});
