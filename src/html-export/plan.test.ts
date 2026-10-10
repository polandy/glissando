import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAGE_SIZE,
  estimatePageBytes,
  pageFileName,
  PAGE_SIZES,
  pageSizeById,
  pictureRendition,
  playerBundleBytes,
} from "./plan";

describe("web page sizes", () => {
  it("offers Small, Sharp and 4K, fitting within 1280×720, 1920×1080 and 3840×2160", () => {
    expect(PAGE_SIZES.map(({ id, bound }) => [id, bound.longEdge, bound.shortEdge])).toEqual([
      ["small", 1280, 720],
      ["sharp", 1920, 1080],
      ["4k", 3840, 2160],
    ]);
  });

  it("defaults to Small", () => {
    expect(DEFAULT_PAGE_SIZE).toBe("small");
  });

  it("finds a size by id", () => {
    expect(pageSizeById("sharp").bound).toEqual({ longEdge: 1920, shortEdge: 1080 });
  });
});

describe("pictureRendition", () => {
  it.each([
    ["landscape", { width: 3840, height: 2160 }, "small", { width: 1280, height: 720 }],
    ["portrait", { width: 2160, height: 3840 }, "small", { width: 720, height: 1280 }],
    [
      "4:3 by its short edge",
      { width: 3000, height: 2250 },
      "sharp",
      { width: 1440, height: 1080 },
    ],
  ] as const)("scales a %s picture down to fit the size", (_, stored, size, fitted) => {
    expect(pictureRendition(stored, size)).toEqual({ kind: "scaled", size: fitted });
  });

  it("keeps the stored bytes of a picture that already fits the size, never scaling up", () => {
    expect(pictureRendition({ width: 1000, height: 600 }, "small")).toEqual({ kind: "stored" });
  });

  it("keeps the stored bytes at 4K, which every stored picture fits", () => {
    expect(pictureRendition({ width: 3840, height: 2160 }, "4k")).toEqual({ kind: "stored" });
  });
});

describe("estimatePageBytes", () => {
  it("scales each picture's bytes by its pixel share, adds music and page, plus a third for base64", () => {
    const estimate = estimatePageBytes(
      {
        pictures: [
          // A quarter of the pixels at Small.
          { width: 2560, height: 1440, bytes: 4000 },
          // Already fits: counted whole.
          { width: 800, height: 600, bytes: 1000 },
        ],
        musicBytes: 3000,
        pageBytes: 2000,
      },
      "small",
    );

    expect(estimate).toBeCloseTo(((4000 / 4 + 1000 + 3000 + 2000) * 4) / 3);
  });
});

describe("pageFileName", () => {
  it("names the page after the title, with refused characters replaced by a dash", () => {
    expect(pageFileName('Sommer: Rom/Neapel "2026"')).toBe("Sommer- Rom-Neapel -2026.html");
  });
});

describe("playerBundleBytes", () => {
  it("counts the bundle's script, style and font in UTF-8 bytes", () => {
    const bundle = { script: "play()", style: "a{content:'é'}", captionFontDataUrl: "data:x" };

    expect(playerBundleBytes(bundle)).toBe(6 + 15 + 6);
  });
});
