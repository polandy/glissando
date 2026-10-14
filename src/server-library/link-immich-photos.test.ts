import { describe, expect, it } from "vitest";
import type { ImmichPhoto } from "../immich/immich-client";
import type { PictureColours } from "../library/picture-colours";
import { linkImmichPhotos, type LinkImmichPhotosPorts } from "./link-immich-photos";

const SOME_COLOURS: PictureColours = { veil: "#112233", accent: "#AABBCC" };

function immichPhoto(
  id: string,
  size: ImmichPhoto["size"] = { width: 4000, height: 3000 },
): ImmichPhoto {
  return { id, fileName: `${id}.jpg`, takenAt: "2025-07-12T14:30:00.000Z", size };
}

/** Answers every photo with `SOME_COLOURS` and records which photos it was asked about. */
function fakeColours(): LinkImmichPhotosPorts & { readonly asked: string[] } {
  const asked: string[] = [];
  return {
    asked,
    colours: (photo) => {
      asked.push(photo.id);
      return Promise.resolve(SOME_COLOURS);
    },
  };
}

describe("linkImmichPhotos", () => {
  it("links each photo as a picture whose id is its Immich asset, without downloading it", async () => {
    const { pictures } = await linkImmichPhotos([immichPhoto("asset-1")], [], fakeColours());

    expect(pictures).toEqual([
      {
        id: "asset-1",
        immichAssetId: "asset-1",
        fileName: "asset-1.jpg",
        capturedAt: "2025-07-12T14:30:00.000Z",
        colours: SOME_COLOURS,
        width: 2880,
        height: 2160,
      },
    ]);
  });

  it("reads a linked photo's colours from a thumbnail, asking once per photo kept", async () => {
    const ports = fakeColours();

    await linkImmichPhotos([immichPhoto("asset-1"), immichPhoto("asset-2")], [], ports);

    expect(ports.asked).toEqual(["asset-1", "asset-2"]);
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
  ])("%s", async (_, size, expected) => {
    const { pictures } = await linkImmichPhotos([immichPhoto("asset-1", size)], [], fakeColours());
    const [picture] = pictures;

    expect({ width: picture?.width, height: picture?.height }).toEqual(expected);
  });

  it("takes the display bound for a photo whose size Immich has not read", async () => {
    const { pictures } = await linkImmichPhotos([immichPhoto("asset-1", null)], [], fakeColours());
    const [picture] = pictures;

    expect({ width: picture?.width, height: picture?.height }).toEqual({
      width: 3840,
      height: 2160,
    });
  });

  it("skips photos already in the slideshow or picked twice, and names them (ADR-0016)", async () => {
    const existing = [
      { fileName: "x.jpg", capturedAt: "2025-01-01T00:00:00Z", immichAssetId: "asset-1" },
    ];

    const linked = await linkImmichPhotos(
      [immichPhoto("asset-1"), immichPhoto("asset-2"), immichPhoto("asset-2")],
      existing,
      fakeColours(),
    );

    expect(linked.pictures.map((picture) => picture.id)).toEqual(["asset-2"]);
    expect(linked.skipped).toEqual([
      { fileName: "asset-1.jpg", reason: "alreadyIn" },
      { fileName: "asset-2.jpg", reason: "chosenTwice" },
    ]);
  });

  it("never asks for the colours of a photo it skips", async () => {
    const existing = [
      { fileName: "x.jpg", capturedAt: "2025-01-01T00:00:00Z", immichAssetId: "asset-1" },
    ];
    const ports = fakeColours();

    await linkImmichPhotos([immichPhoto("asset-1")], existing, ports);

    expect(ports.asked).toEqual([]);
  });
});
