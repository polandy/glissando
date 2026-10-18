import { describe, expect, it } from "vitest";
import { readManifest } from "./read-manifest";
import {
  BASE_MANIFEST,
  validateManifestSchema,
  withAt,
  withoutAt,
} from "./testing/manifest-schema-fixtures";

const MINIMAL_PICTURE = {
  format: "glissando",
  formatVersion: 14,
  slideshow: {
    title: "T",
    createdAt: "2025-01-01T00:00:00Z",
    secondsPerPicture: 5,
    pictures: [
      {
        file: "pictures/0001.png",
        capturedAt: "2025-01-01T00:00:00Z",
        width: 10,
        height: 10,
        fileName: "a.jpg",
        colours: { veil: "#000000", accent: "#FFFFFF" },
      },
    ],
    songs: [],
  },
};

const picture0 = ["slideshow", "pictures", 0] as const;

function expectBothRefuse(doc: unknown): void {
  expect(validateManifestSchema(doc)).toBe(false);
  expect(readManifest(JSON.stringify(doc)).kind).not.toBe("ok");
}

describe("PICTURE_SCHEMA: broken pictures", () => {
  it.each([
    ["missing file", withoutAt(MINIMAL_PICTURE, [...picture0, "file"])],
    ["missing capturedAt", withoutAt(MINIMAL_PICTURE, [...picture0, "capturedAt"])],
    ["missing width", withoutAt(MINIMAL_PICTURE, [...picture0, "width"])],
    ["missing height", withoutAt(MINIMAL_PICTURE, [...picture0, "height"])],
    ["missing fileName", withoutAt(MINIMAL_PICTURE, [...picture0, "fileName"])],
    ["missing colours", withoutAt(MINIMAL_PICTURE, [...picture0, "colours"])],
    ["an unknown key", withAt(MINIMAL_PICTURE, [...picture0, "extra"], true)],
    ["width of the wrong type", withAt(MINIMAL_PICTURE, [...picture0, "width"], "10")],
    ["height of the wrong type", withAt(MINIMAL_PICTURE, [...picture0, "height"], "10")],
    ["fileName of the wrong type", withAt(MINIMAL_PICTURE, [...picture0, "fileName"], 5)],
    ["capturedAt of the wrong type", withAt(MINIMAL_PICTURE, [...picture0, "capturedAt"], 12345)],
    ["colours of the wrong type", withAt(MINIMAL_PICTURE, [...picture0, "colours"], "red")],
    ["width zero", withAt(MINIMAL_PICTURE, [...picture0, "width"], 0)],
    [
      "colours missing accent",
      withAt(MINIMAL_PICTURE, [...picture0, "colours"], { veil: "#404040" }),
    ],
    [
      "colours.veil not a hex colour",
      withAt(MINIMAL_PICTURE, [...picture0, "colours"], { veil: "red", accent: "#C0C0C0" }),
    ],
    ["transition an outsider", withAt(MINIMAL_PICTURE, [...picture0, "transition"], "nonsense")],
    [
      "durationMs just below its minimum",
      withAt(MINIMAL_PICTURE, [...picture0, "durationMs"], 1999),
    ],
    [
      "durationMs just above its maximum",
      withAt(MINIMAL_PICTURE, [...picture0, "durationMs"], 15001),
    ],
    ["durationMs off the 500 ms step", withAt(MINIMAL_PICTURE, [...picture0, "durationMs"], 2100)],
    [
      "kenBurns from.zoom below its minimum",
      withAt(MINIMAL_PICTURE, [...picture0, "kenBurns"], {
        from: { zoom: 0.9, centerX: 0, centerY: 0 },
        to: { zoom: 1, centerX: 0, centerY: 0 },
      }),
    ],
    [
      "kenBurns to.zoom above its maximum",
      withAt(MINIMAL_PICTURE, [...picture0, "kenBurns"], {
        from: { zoom: 1, centerX: 0, centerY: 0 },
        to: { zoom: 3.1, centerX: 0, centerY: 0 },
      }),
    ],
    [
      "kenBurns centerX below its minimum",
      withAt(MINIMAL_PICTURE, [...picture0, "kenBurns"], {
        from: { zoom: 1, centerX: -0.1, centerY: 0 },
        to: { zoom: 1, centerX: 0, centerY: 0 },
      }),
    ],
    [
      "kenBurns centerY above its maximum",
      withAt(MINIMAL_PICTURE, [...picture0, "kenBurns"], {
        from: { zoom: 1, centerX: 0, centerY: 0 },
        to: { zoom: 1, centerX: 0, centerY: 1.1 },
      }),
    ],
    [
      "immichAssetId and fileBytes, both present",
      withAt(BASE_MANIFEST, [...picture0, "immichAssetId"], "asset-both"),
    ],
    [
      "video.endMs of the wrong type",
      withAt(BASE_MANIFEST, [...picture0, "video", "endMs"], "6000"),
    ],
    ["video.volume below its minimum", withAt(BASE_MANIFEST, [...picture0, "video", "volume"], -5)],
    [
      "video.volume above its maximum",
      withAt(BASE_MANIFEST, [...picture0, "video", "volume"], 105),
    ],
    ["video.volume off the 5-step", withAt(BASE_MANIFEST, [...picture0, "video", "volume"], 61)],
    ["video.duckMusic not false", withAt(BASE_MANIFEST, [...picture0, "video", "duckMusic"], true)],
  ])("%s is refused by both the reader and the schema", (_name, doc) => {
    expectBothRefuse(doc);
  });
});

describe("PICTURE_SCHEMA: a caption's whitespace", () => {
  const caption = ["slideshow", "pictures", 0, "caption"] as const;

  it.each([
    ["empty", ""],
    ["a leading space", " Beach"],
    ["a trailing space", "Beach "],
    ["a repeated space", "Beach  day"],
    ["a line break", "Beach\nday"],
    ["a tab", "Beach\tday"],
  ])("%s is refused by both", (_name, text) => {
    expectBothRefuse(withAt(BASE_MANIFEST, [...caption], text));
  });

  it("single spaces between words are accepted by both", () => {
    const doc = withAt(BASE_MANIFEST, [...caption], "A day at the beach");
    expect(validateManifestSchema(doc)).toBe(true);
    expect(readManifest(JSON.stringify(doc)).kind).toBe("ok");
  });
});
