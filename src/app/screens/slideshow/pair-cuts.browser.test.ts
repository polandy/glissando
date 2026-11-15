import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { mountWithTranslator } from "../../testing/mount-with-translator";
import type { PictureTile } from "../view-models";
import { markPairCuts, PAIR_CUT_ATTRIBUTE } from "./pair-cuts";
import PictureStrip from "./PictureStrip.svelte";
import { NO_SELECTION } from "./strip-selection";

let cleanUp: (() => void) | null = null;
afterEach(() => {
  cleanUp?.();
  cleanUp = null;
});

/** A grid of `columns` fixed 100 px columns, holding one `li` per class list ("" for a plain tile). */
function grid(columns: number, tiles: readonly string[]): HTMLElement {
  const strip = document.createElement("ol");
  strip.style.cssText = `display: grid; grid-template-columns: repeat(${columns}, 100px); gap: 10px; list-style: none;`;
  for (const classes of tiles) {
    const tile = document.createElement("li");
    tile.className = `tile ${classes}`;
    tile.style.height = "75px";
    strip.append(tile);
  }
  document.body.append(strip);
  cleanUp = () => strip.remove();
  return strip;
}

const cutFlags = (strip: HTMLElement) =>
  Array.from(strip.children, (tile) => tile.hasAttribute(PAIR_CUT_ATTRIBUTE));

describe("markPairCuts (ADR-0028)", () => {
  it("leaves a pair side by side in one row whole", () => {
    const strip = grid(3, ["paired-first", "paired-second", ""]);

    markPairCuts(strip);

    expect(cutFlags(strip)).toEqual([false, false, false]);
  });

  it("marks both tiles of a pair a row break falls between", () => {
    const strip = grid(3, ["", "", "paired-first", "paired-second"]);

    markPairCuts(strip);

    expect(cutFlags(strip)).toEqual([false, false, true, true]);
  });

  it("marks both tiles of a pair a chapter tile falls between", () => {
    const strip = grid(4, ["paired-first", "chapter", "paired-second"]);

    markPairCuts(strip);

    expect(cutFlags(strip)).toEqual([true, false, true]);
  });

  it("clears the mark once the rows reflow and the pair sits together again", () => {
    const strip = grid(3, ["", "", "paired-first", "paired-second"]);
    markPairCuts(strip);
    expect(cutFlags(strip)).toEqual([false, false, true, true]);

    strip.style.gridTemplateColumns = "repeat(4, 100px)";
    markPairCuts(strip);

    expect(cutFlags(strip)).toEqual([false, false, false, false]);
  });
});

const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function tile(id: string, pairedWithNumber: number | null): PictureTile {
  return {
    id,
    thumbnailUrl: PIXEL,
    capturedAt: "2025-07-01T10:00:00Z",
    ownMotion: false,
    ownDurationMs: null,
    ownTransition: null,
    pairedWithNumber,
    rejoinsWithNumber: null,
    blurredFill: false,
    alone: false,
    colours: { veil: "#404040", accent: "#C0C0C0" },
  };
}

describe("PictureStrip marks its cut pairs", () => {
  it("on mount, a pair the third column's row break splits, and not the one beside it", () => {
    // Three 118 px columns fit 400 px; a fourth does not.
    document.body.style.width = "400px";
    const mounted = mountWithTranslator(PictureStrip, {
      pictures: [tile("p1", 2), tile("p2", 1), tile("p3", 4), tile("p4", 3)],
      look: "none" as const,
      newPictureIds: new Set<string>(),
      selection: NO_SELECTION,
      mousePointer: true,
      onSelectionChange: () => undefined,
      onRemoveGroup: () => undefined,
      onShiftGroup: () => undefined,
      onMoveGroup: () => undefined,
      onOpen: () => undefined,
      onView: () => undefined,
      suppressCards: true,
    });
    cleanUp = () => {
      mounted.destroy();
      document.body.style.width = "";
    };
    flushSync();

    const strip = mounted.target.querySelector<HTMLElement>(".strip") as HTMLElement;
    expect(cutFlags(strip)).toEqual([false, false, true, true]);
  });
});
