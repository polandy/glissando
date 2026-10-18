import { describe, expect, it } from "vitest";
import type { ManifestSlideshow } from "./glissando-manifest";
import { slideshowFromManifest } from "./slideshow-from-manifest";

const COLOURS = { veil: "#404040", accent: "#C0C0C0" };

function manifestSlideshow(overrides: Partial<ManifestSlideshow> = {}): ManifestSlideshow {
  return {
    title: "Herbst in Wien",
    createdAt: "2026-01-01T00:00:00Z",
    secondsPerPicture: 5,
    pictures: [
      {
        file: "pictures/0001.jpg",
        thumbnail: "thumbnails/0001.jpg",
        capturedAt: "2026-01-01T00:00:00Z",
        width: 10,
        height: 10,
        fileName: "a.jpg",
        colours: COLOURS,
      },
    ],
    songs: [],
    ...overrides,
  };
}

describe("slideshowFromManifest", () => {
  it("keys each picture by the id given for its index, keeping its fields", () => {
    const mapped = slideshowFromManifest(manifestSlideshow(), {
      pictureIds: ["pictures/0001.jpg"],
      songIds: [],
      clipIds: new Map(),
    });

    expect(mapped.pictures).toEqual([
      {
        id: "pictures/0001.jpg",
        capturedAt: "2026-01-01T00:00:00Z",
        width: 10,
        height: 10,
        fileName: "a.jpg",
        colours: COLOURS,
      },
    ]);
  });

  it("keeps a picture's own motion, caption, duration, transition, origin and alone mark", () => {
    const mapped = slideshowFromManifest(
      manifestSlideshow({
        pictures: [
          {
            file: "pictures/0001.jpg",
            thumbnail: "thumbnails/0001.jpg",
            capturedAt: "2026-01-01T00:00:00Z",
            width: 10,
            height: 10,
            fileName: "a.jpg",
            colours: COLOURS,
            kenBurns: {
              from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
              to: { zoom: 1.1, centerX: 0.5, centerY: 0.5 },
            },
            caption: "Am Steg",
            durationMs: 8000,
            transition: "dissolve",
            immichAssetId: "asset-a1",
            alone: true,
          },
        ],
      }),
      { pictureIds: ["p1"], songIds: [], clipIds: new Map() },
    );

    expect(mapped.pictures[0]).toMatchObject({
      caption: "Am Steg",
      durationMs: 8000,
      transition: "dissolve",
      immichAssetId: "asset-a1",
      alone: true,
    });
    expect(mapped.pictures[0]).not.toHaveProperty("fileBytes");
  });

  it("keys each song by the id given for its index, keeping its own excerpt and fades", () => {
    const mapped = slideshowFromManifest(
      manifestSlideshow({
        songs: [
          {
            file: "music/track-1.m4a",
            fileName: "Walzer.m4a",
            durationMs: 200_000,
            mimeType: "audio/mp4",
            trim: { startMs: 12_000, endMs: 200_000 },
            fadeOutMs: 5000,
          },
        ],
      }),
      { pictureIds: ["p1"], songIds: ["s1"], clipIds: new Map() },
    );

    expect(mapped.songs).toEqual([
      {
        id: "s1",
        fileName: "Walzer.m4a",
        durationMs: 200_000,
        mimeType: "audio/mp4",
        trim: { startMs: 12_000, endMs: 200_000 },
        fadeOutMs: 5000,
      },
    ]);
  });

  it("resolves a video slide's clip through clipIds, by the clip's container path", () => {
    const mapped = slideshowFromManifest(
      manifestSlideshow({
        pictures: [
          {
            file: "pictures/0001.jpg",
            thumbnail: "thumbnails/0001.jpg",
            capturedAt: "2026-01-01T00:00:00Z",
            width: 10,
            height: 10,
            fileName: "a.jpg",
            colours: COLOURS,
            video: {
              file: "videos/clip-1.mp4",
              mimeType: "video/mp4",
              sourceMs: 0,
              startMs: 0,
              endMs: 2000,
            },
          },
        ],
      }),
      {
        pictureIds: ["p1"],
        songIds: [],
        clipIds: new Map([["videos/clip-1.mp4", "clip-id-1"]]),
      },
    );

    expect(mapped.pictures[0]?.video).toMatchObject({ mediaId: "clip-id-1" });
  });

  it("carries the slideshow-level settings it has and leaves the automatic ones out", () => {
    const mapped = slideshowFromManifest(
      manifestSlideshow({ ownOrder: true, transition: "alternate" }),
      { pictureIds: ["p1"], songIds: [], clipIds: new Map() },
    );

    expect(mapped.ownOrder).toBe(true);
    expect(mapped.transition).toBe("alternate");
    expect(mapped).not.toHaveProperty("pictureLength");
    expect(mapped).not.toHaveProperty("portraitPictures");
    expect(mapped).not.toHaveProperty("betweenSongs");
    expect(mapped).not.toHaveProperty("openingCard");
    expect(mapped).not.toHaveProperty("closingCard");
  });

  it("maps opening and closing cards' picture backgrounds by the mapped pictures' new ids", () => {
    const mapped = slideshowFromManifest(
      manifestSlideshow({
        openingCard: {
          title: "Herbst in Wien",
          style: "modern",
          position: "centre",
          entrance: "rise",
          background: { kind: "picture", pictureIndex: 0, fade: 50, tint: "dark" },
          motion: false,
        },
      }),
      { pictureIds: ["new-picture-id"], songIds: [], clipIds: new Map() },
    );

    expect(mapped.openingCard?.background).toMatchObject({
      kind: "picture",
      pictureId: "new-picture-id",
    });
  });
});
