import { afterEach, describe, expect, it } from "vitest";
import { byLabel, details, mountScreen, unmountScreen } from "./slideshow-screen-harness";

afterEach(() => unmountScreen());

describe("SlideshowScreen, adding pictures", () => {
  it("offers Add media beside the picture count", () => {
    const { calls } = mountScreen();

    byLabel("Medien hinzufügen").click();

    expect(calls.adds).toBe(1);
  });

  it("has no Add tile in the strip; the head's Add is the one way in", () => {
    const { calls, target } = mountScreen(details(["a", "b"]));

    const head = target.querySelector(".strip-head");
    expect(head?.querySelector('button[aria-label="Medien hinzufügen"]')).not.toBeNull();
    const tiles = [...target.querySelectorAll(".strip > li")];
    expect(tiles.filter((tile) => tile.querySelector(".pick") !== null)).toHaveLength(2);
    expect(tiles.some((tile) => tile.textContent?.includes("Hinzufügen"))).toBe(false);
    expect(calls.adds).toBe(0);
  });

  it("marks the pictures just added as new, for the eye and in their description", () => {
    const { target } = mountScreen(details(["a", "b", "c"]), { newPictureIds: new Set(["b"]) });

    // The strip also holds the title and closing slide tiles (TITLE_SLIDES.md), neither a picture.
    const tiles = [...target.querySelectorAll(".strip > li")].filter(
      (tile) => tile.querySelector(".pick") !== null,
    );
    expect(tiles.map((tile) => tile.classList.contains("new"))).toEqual([false, true, false]);
    expect(tiles[1]?.textContent).toContain("neu");
    expect(tiles[1]?.querySelector("img")?.alt).toBe("Bild 2, aufgenommen am 02.07.2025, neu");
  });
});
