import { afterEach, describe, expect, it } from "vitest";
import { byLabel, details, mountScreen, unmountScreen } from "./slideshow-screen-harness";

afterEach(() => unmountScreen());

describe("SlideshowScreen, adding pictures", () => {
  it("offers Add pictures beside the picture count", () => {
    const { calls } = mountScreen();

    byLabel("Bilder hinzufügen").click();

    expect(calls.adds).toBe(1);
  });

  it("marks the pictures just added as new, for the eye and in their description", () => {
    const { target } = mountScreen(details(["a", "b", "c"]), { newPictureIds: new Set(["b"]) });

    const tiles = [...target.querySelectorAll(".strip > li")];
    expect(tiles.map((tile) => tile.classList.contains("new"))).toEqual([false, true, false]);
    expect(tiles[1]?.textContent).toContain("neu");
    expect(tiles[1]?.querySelector("img")?.alt).toBe("Bild 2, aufgenommen am 02.07.2025, neu");
  });
});
