import { describe, expect, it } from "vitest";
import type { ImmichPhoto } from "../immich/immich-client";
import { linkImmichPhotos } from "./link-immich-photos";

function immichPhoto(
  id: string,
  size: ImmichPhoto["size"] = { width: 4000, height: 3000 },
): ImmichPhoto {
  return { id, fileName: `${id}.jpg`, takenAt: "2025-07-12T14:30:00.000Z", size };
}

describe("linkImmichPhotos", () => {
  it("links each photo as a picture whose id is its Immich asset, without downloading it", () => {
    const { pictures } = linkImmichPhotos([immichPhoto("asset-1")], []);

    expect(pictures).toEqual([
      {
        id: "asset-1",
        immichAssetId: "asset-1",
        fileName: "asset-1.jpg",
        capturedAt: "2025-07-12T14:30:00.000Z",
        width: 2880,
        height: 2160,
      },
    ]);
  });

  it.each([
    [
      "a photo within the display bound keeps its size",
      { width: 1920, height: 1080 },
      { width: 1920, height: 1080 },
    ],
    [
      "a large portrait photo fits the display bound",
      { width: 3000, height: 6000 },
      { width: 1920, height: 3840 },
    ],
  ])("%s", (_, size, expected) => {
    const [picture] = linkImmichPhotos([immichPhoto("asset-1", size)], []).pictures;

    expect({ width: picture?.width, height: picture?.height }).toEqual(expected);
  });

  it("takes the display bound for a photo whose size Immich has not read", () => {
    const [picture] = linkImmichPhotos([immichPhoto("asset-1", null)], []).pictures;

    expect({ width: picture?.width, height: picture?.height }).toEqual({
      width: 3840,
      height: 2160,
    });
  });

  it("skips photos already in the slideshow or picked twice, and counts them (ADR-0016)", () => {
    const existing = [
      { fileName: "x.jpg", capturedAt: "2025-01-01T00:00:00Z", immichAssetId: "asset-1" },
    ];

    const linked = linkImmichPhotos(
      [immichPhoto("asset-1"), immichPhoto("asset-2"), immichPhoto("asset-2")],
      existing,
    );

    expect(linked.pictures.map((picture) => picture.id)).toEqual(["asset-2"]);
    expect(linked.skipped).toBe(2);
  });
});
