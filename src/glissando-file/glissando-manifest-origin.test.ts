import { describe, expect, it } from "vitest";
import { ORIGIN_FROM_VERSION, manifestFor } from "./glissando-manifest";
import { readManifest } from "./read-manifest";
import type { StoredSlideshow } from "../library/stored-slideshow";

const slideshow: StoredSlideshow = {
  id: "show-1",
  title: "Herbst in Wien",
  createdAt: "2025-10-01T08:00:00.000Z",
  pictures: [
    {
      id: "p1",
      capturedAt: "2025-09-30T10:00:00Z",
      width: 3840,
      height: 2160,
      fileName: "a.jpg",
      immichAssetId: "asset-123",
    },
    {
      id: "p2",
      capturedAt: "2025-09-30T11:00:00Z",
      width: 2160,
      height: 3840,
      fileName: "b.jpg",
      fileBytes: 4_200_000,
    },
  ],
  secondsPerPicture: 5,
};

const JPEG = { display: "image/jpeg", thumbnail: "image/jpeg" };
const manifest = () => manifestFor(slideshow, [JPEG, JPEG]);
const asText = (value: unknown): string => JSON.stringify(value);

/** The written manifest with picture `index` changed and `formatVersion` set. */
function withPicture(
  index: 0 | 1,
  change: Record<string, unknown>,
  formatVersion = ORIGIN_FROM_VERSION,
): string {
  const written = manifest();
  const pictures = written.slideshow.pictures.map((picture, i) =>
    i === index ? { ...picture, ...change } : picture,
  );
  return asText({ ...written, formatVersion, slideshow: { ...written.slideshow, pictures } });
}

describe("a picture's origin in the .glissando file", () => {
  it("is written from format version 7, the version that carries it", () => {
    expect(ORIGIN_FROM_VERSION).toBe(7);
    expect(manifest().slideshow.pictures[0]).toMatchObject({ immichAssetId: "asset-123" });
    expect(manifest().slideshow.pictures[1]).toMatchObject({ fileBytes: 4_200_000 });
    expect(manifest().slideshow.pictures[0]).not.toHaveProperty("fileBytes");
    expect(manifest().slideshow.pictures[1]).not.toHaveProperty("immichAssetId");
  });

  it("reads back as written", () => {
    expect(readManifest(asText(manifest()))).toEqual({ kind: "ok", manifest: manifest() });
  });

  it("reads a version 6 file, which knows no origin", () => {
    const written = manifest();
    const pictures = written.slideshow.pictures.map((picture) => ({
      ...picture,
      immichAssetId: undefined,
      fileBytes: undefined,
    }));
    const versionSix = {
      ...written,
      formatVersion: 6,
      slideshow: { ...written.slideshow, pictures },
    };

    const reading = readManifest(asText(versionSix));

    expect(reading.kind === "ok" && reading.manifest.slideshow.pictures[0]?.fileName).toBe("a.jpg");
    expect(reading.kind === "ok" && reading.manifest.slideshow.pictures[0]).not.toHaveProperty(
      "immichAssetId",
    );
    expect(reading.kind === "ok" && reading.manifest.slideshow.pictures[1]).not.toHaveProperty(
      "fileBytes",
    );
  });

  it.each([
    ["an Immich asset id in a version 6 file", withPicture(1, { fileBytes: undefined }, 6)],
    ["a file size in a version 6 file", withPicture(0, { immichAssetId: undefined }, 6)],
  ])("takes %s for a damaged file", (_, text) => {
    expect(readManifest(text).kind).toBe("damaged");
  });

  it("names a bad Immich asset id's path and value", () => {
    expect(readManifest(withPicture(0, { immichAssetId: "" }))).toEqual({
      kind: "damaged",
      reason:
        'glissando.json slideshow.pictures[0].immichAssetId: expected a non-empty string, got ""',
    });
  });

  it.each([
    ["zero", 0],
    ["negative", -1],
    ["no whole number", 1.5],
    ["unsafe", Number.MAX_SAFE_INTEGER + 1],
    ["no number", "4200000"],
  ])("names a bad file size (%s) path and value", (_, fileBytes) => {
    const text = withPicture(1, { fileBytes });

    expect(readManifest(text)).toEqual({
      kind: "damaged",
      reason: `glissando.json slideshow.pictures[1].fileBytes: expected a positive whole number, got ${JSON.stringify(fileBytes)}`,
    });
  });
});
