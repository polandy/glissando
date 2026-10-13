import { afterEach, describe, expect, it } from "vitest";
import { mountWithTranslator } from "../../testing/mount-with-translator";
import type { PictureTile } from "../view-models";
import StripTile from "./StripTile.svelte";

let destroy: (() => void) | null = null;
afterEach(() => {
  destroy?.();
  destroy = null;
});

function picture(overrides: Partial<PictureTile> = {}): PictureTile {
  return {
    id: "p1",
    thumbnailUrl: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    capturedAt: "2025-07-01T10:00:00Z",
    ownMotion: false,
    ownDurationMs: null,
    ownTransition: null,
    pairedWithNumber: null,
    blurredFill: false,
    alone: false,
    ...overrides,
  };
}

function mountTile(pictureOverrides: Partial<PictureTile> = {}, number = 1) {
  const mounted = mountWithTranslator(StripTile, {
    picture: picture(pictureOverrides),
    number,
    selected: false,
    selecting: false,
    isNew: false,
    mousePointer: true,
    dragging: false,
    drop: null,
    removable: true,
    onPick: () => {},
    onOpen: () => {},
    onKeydown: () => {},
    onRemove: () => {},
  });
  destroy = mounted.destroy;
  return mounted.target;
}

describe("StripTile, a portrait pair (ADR-0028)", () => {
  it("joins the pair with a bar, each tile drawing its own half", () => {
    const first = mountTile({ pairedWithNumber: 2 }, 1);
    const second = mountTile({ pairedWithNumber: 1 }, 2);

    expect(first.querySelector(".tile")?.classList.contains("paired-first")).toBe(true);
    expect(second.querySelector(".tile")?.classList.contains("paired-second")).toBe(true);
  });

  it("names the pair partner in the picture's accessible label", () => {
    const target = mountTile({ pairedWithNumber: 2 }, 1);

    const label = target.querySelector("img")?.getAttribute("alt") ?? "";
    expect(label.startsWith("Bild 1, aufgenommen am ")).toBe(true);
    expect(label.endsWith(", gezeigt als Paar mit Bild 2")).toBe(true);
  });

  it("stays unpaired without a bar or a mention in the label", () => {
    const target = mountTile();

    const tile = target.querySelector(".tile");
    expect(tile?.classList.contains("paired-first")).toBe(false);
    expect(tile?.classList.contains("paired-second")).toBe(false);
    expect(target.querySelector("img")?.getAttribute("alt")).not.toContain("Paar");
  });
});

describe("StripTile, the alone and blurred fill badges (ADR-0028)", () => {
  const ALONE = '[title="Allein gezeigt"]';
  const BLURRED_FILL = '[title="Unscharfe Füllung"]';

  it("badges a picture set to always alone", () => {
    const target = mountTile({ alone: true });

    expect(target.querySelector(ALONE)).not.toBeNull();
  });

  it("badges a picture shown over a blurred fill", () => {
    const target = mountTile({ blurredFill: true });

    expect(target.querySelector(BLURRED_FILL)).not.toBeNull();
  });

  it("names both in the picture's accessible label", () => {
    const label = (overrides: Partial<PictureTile>) =>
      mountTile(overrides).querySelector("img")?.getAttribute("alt") ?? "";

    expect(label({ alone: true }).endsWith(", allein gezeigt")).toBe(true);
    destroy?.();
    expect(label({ blurredFill: true }).endsWith(", über einer unscharfen Füllung")).toBe(true);
  });

  it("shows neither badge for a plain covered picture", () => {
    const target = mountTile();

    expect(target.querySelector("img")).not.toBeNull();
    expect(target.querySelector("img")?.getAttribute("alt")).toMatch(/^Bild 1, aufgenommen am /);
    expect(target.querySelector("img")?.getAttribute("alt")).not.toMatch(/allein|Füllung/);
    expect(target.querySelector(ALONE)).toBeNull();
    expect(target.querySelector(BLURRED_FILL)).toBeNull();
  });
});
