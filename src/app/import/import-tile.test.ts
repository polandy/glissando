import { describe, expect, it } from "vitest";
import type { StoredPicture } from "../../library/stored-slideshow";
import { importPictureTile } from "./import-tile";

const COLOURS = { veil: "#404040", accent: "#C0C0C0" };

const picture: StoredPicture = {
  id: "p1",
  capturedAt: "2025-07-01T10:00:00Z",
  width: 300,
  height: 200,
  fileName: "a.jpg",
  colours: COLOURS,
};

describe("importPictureTile", () => {
  it("shows a still picture alone, with no motion, duration, transition or pairing of its own", () => {
    expect(importPictureTile(picture, "url:p1")).toEqual({
      id: "p1",
      thumbnailUrl: "url:p1",
      capturedAt: "2025-07-01T10:00:00Z",
      ownMotion: false,
      ownDurationMs: null,
      ownTransition: null,
      pairedWithNumber: null,
      blurredFill: false,
      alone: false,
      colours: COLOURS,
    });
  });

  it("marks a picture never composed into a pair as alone", () => {
    expect(importPictureTile({ ...picture, alone: true }, "url:p1").alone).toBe(true);
  });

  it("carries a clip's excerpt length, not its whole source length", () => {
    const withVideo: StoredPicture = {
      ...picture,
      video: { mediaId: "v1", sourceMs: 9000, startMs: 1000, endMs: 4000 },
    };
    expect(importPictureTile(withVideo, "url:p1").clipMs).toBe(3000);
  });

  it("carries no clip length for a plain picture", () => {
    expect(importPictureTile(picture, "url:p1").clipMs).toBeUndefined();
  });
});
