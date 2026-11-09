import "../../../styles/tokens.css";
import "../../../styles/base.css";
import { flushSync } from "svelte";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { mountWithTranslator } from "../../testing/mount-with-translator";
import { reactiveProps } from "../../testing/reactive-props.svelte";
import type { PictureTile } from "../view-models";
import PictureStrip from "./PictureStrip.svelte";
import { soleSelection } from "./strip-selection";

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 900 };
/** Long enough that the last tile lies several screens below the first. */
const PICTURE_COUNT = 40;
const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const tiles: PictureTile[] = Array.from({ length: PICTURE_COUNT }, (_, index) => ({
  id: `p${index + 1}`,
  thumbnailUrl: PIXEL,
  capturedAt: "2025-07-01T10:00:00Z",
  ownMotion: false,
  ownDurationMs: null,
  ownTransition: null,
  pairedWithNumber: null,
  blurredFill: false,
  alone: false,
  colours: { veil: "#404040", accent: "#C0C0C0" },
}));

let destroy: (() => void) | null = null;

beforeEach(async () => {
  await page.viewport(PHONE.width, PHONE.height);
});

afterEach(async () => {
  destroy?.();
  destroy = null;
  window.scrollTo(0, 0);
  await page.viewport(DESKTOP.width, DESKTOP.height);
});

describe("PictureStrip: a moved selected tile", () => {
  it("scrolls into view when the order moves it from first to last", () => {
    const props = reactiveProps({
      pictures: tiles,
      look: "none" as const,
      newPictureIds: new Set<string>(),
      selection: soleSelection("p1"),
      mousePointer: false,
      onSelectionChange: () => {},
      onRemoveGroup: () => {},
      onShiftGroup: () => {},
      onMoveGroup: () => {},
      onOpen: () => {},
      onView: () => {},
      suppressCards: true,
    });
    const mounted = mountWithTranslator(PictureStrip, props);
    destroy = mounted.destroy;
    const tileOf = (id: string) =>
      mounted.target.querySelector(`[data-picture-id="${id}"]`)?.closest("li") as HTMLElement;
    expect(tileOf("p1").getBoundingClientRect().top).toBeLessThan(PHONE.height);

    props.pictures = [...tiles.slice(1), tiles[0] as PictureTile];
    flushSync();

    const box = tileOf("p1").getBoundingClientRect();
    expect(box.top).toBeGreaterThanOrEqual(0);
    expect(box.bottom).toBeLessThanOrEqual(PHONE.height);
  });
});
