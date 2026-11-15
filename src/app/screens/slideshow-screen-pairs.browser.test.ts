import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { PictureTile } from "./view-models";
import { byLabel, details, mountScreen, unmountScreen } from "./slideshow-screen-harness";

afterEach(() => unmountScreen());

/** Pictures a and b share a slide (ADR-0028); c is on its own, `cOverrides` aside. */
function pairedShow(cOverrides: Partial<PictureTile> = {}) {
  const show = details(["a", "b", "c"]);
  const [a, b, c] = show.pictures as [PictureTile, PictureTile, PictureTile];
  return {
    ...show,
    pairCount: 1,
    pictures: [
      { ...a, pairedWithNumber: 2 },
      { ...b, pairedWithNumber: 1 },
      { ...c, ...cOverrides },
    ],
  };
}

function select(pictureId: string): void {
  document.querySelector<HTMLButtonElement>(`.pick[data-picture-id="${pictureId}"]`)?.click();
  flushSync();
}

const scissors = () => byLabel("Bild 1 und 2 trennen");
const reachable = (element: HTMLElement) => getComputedStyle(element).pointerEvents !== "none";

describe("SlideshowScreen: splitting a portrait pair (ADR-0028)", () => {
  it("puts the scissors on the pair's bridge, out of reach until a picture of it is selected", () => {
    mountScreen(pairedShow());

    expect(reachable(scissors())).toBe(false);
    expect(scissors().tabIndex).toBe(-1);

    select("b");

    expect(reachable(scissors())).toBe(true);
    expect(scissors().tabIndex).toBe(0);
  });

  it("one click on the scissors splits the pair", () => {
    const { calls } = mountScreen(pairedShow());
    select("a");

    scissors().click();

    expect(calls.splitPairs).toEqual(["a"]);
  });

  it("the selection bar offers Split for a picture of the pair", () => {
    const { calls } = mountScreen(pairedShow());
    select("b");

    byLabel("Trennen").click();

    expect(calls.splitPairs).toEqual(["b"]);
  });

  it("the selection bar offers Pair again for an alone picture that would pair without its mark", () => {
    const show = pairedShow();
    const [a, b, c] = show.pictures as [PictureTile, PictureTile, PictureTile];
    const { calls } = mountScreen({
      ...show,
      pictures: [
        { ...a, pairedWithNumber: null },
        { ...b, pairedWithNumber: null, alone: true, rejoinsWithNumber: 1 },
        c,
      ],
    });
    select("b");

    byLabel("Wieder als Paar").click();

    expect(calls.rejoinedPairs).toEqual(["b"]);
  });

  it("a single picture's bar offers neither", () => {
    mountScreen(pairedShow());
    select("c");

    expect(byLabel("Kapitel davor einfügen")).toBeInstanceOf(HTMLButtonElement);
    expect(() => byLabel("Trennen")).toThrow();
    expect(() => byLabel("Wieder als Paar")).toThrow();
  });
});
