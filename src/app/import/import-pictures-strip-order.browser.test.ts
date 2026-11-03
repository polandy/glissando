import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";
import {
  arrangementWith,
  mountStrip,
  nameOf,
  text,
  tiles,
} from "../testing/import-pictures-strip-fixtures";

describe("ImportPicturesStrip, the order rule", () => {
  it("reads capture order while the import runs, until Shuffle makes it the user's own", () => {
    const arrangement = arrangementWith(["a", "b", "c"], [0]);
    const { target } = mountStrip({ ids: ["a", "b", "c"], busy: true, arrangement });

    expect(text(target.querySelector(".sorted"))).toBe(
      "Aufnahmereihenfolge · neue Bilder werden nach Datum einsortiert",
    );

    target.querySelector<HTMLButtonElement>("button.shuffle")?.click();
    flushSync();

    expect(text(target.querySelector(".sorted"))).toBe(
      "Eigene Reihenfolge · neue Bilder kommen ans Ende",
    );
  });
});

describe("ImportPicturesStrip, arranging after the import", () => {
  const tileIds = (target: HTMLElement) =>
    tiles(target).map((tile) => tile.closest("[data-picture-id]")?.getAttribute("data-picture-id"));

  it("shows the shuffled order once Shuffle is pressed", () => {
    const arrangement = arrangementWith(["a", "b", "c"], [0]);
    const { target } = mountStrip({ ids: ["a", "b", "c"], arrangement });
    expect(tileIds(target)).toEqual(["a", "b", "c"]);

    target.querySelector<HTMLButtonElement>("button.shuffle")?.click();
    flushSync();

    expect(arrangement.state.order).not.toEqual(["a", "b", "c"]);
    expect(tileIds(target)).toEqual(arrangement.state.order);
  });

  it("returns to capture order with Sort by date, which then goes away", () => {
    const arrangement = arrangementWith(["a", "b", "c"], [0]);
    const { target } = mountStrip({ ids: ["a", "b", "c"], arrangement });
    expect(target.querySelector("button.sort-by-date")).toBeNull();
    target.querySelector<HTMLButtonElement>("button.shuffle")?.click();
    flushSync();
    expect(tileIds(target)).not.toEqual(["a", "b", "c"]);

    target.querySelector<HTMLButtonElement>("button.sort-by-date")?.click();
    flushSync();

    expect(tileIds(target)).toEqual(["a", "b", "c"]);
    expect(text(target.querySelector(".sorted"))).toBe("Aufnahmereihenfolge");
    expect(target.querySelector("button.sort-by-date")).toBeNull();
  });

  it("moves the selected picture one place on with Later", () => {
    const arrangement = arrangementWith(["a", "b", "c"]);
    const { target } = mountStrip({ ids: ["a", "b", "c"], arrangement });

    tiles(target)[0]?.click();
    flushSync();
    const later = [...target.querySelectorAll('[role="toolbar"] button')].find(
      (button) => nameOf(button) === "Später",
    );
    (later as HTMLButtonElement | undefined)?.click();
    flushSync();

    expect(tileIds(target)).toEqual(["b", "a", "c"]);
  });
});
