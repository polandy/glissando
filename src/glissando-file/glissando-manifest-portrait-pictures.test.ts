import { describe, expect, it } from "vitest";
import { GLISSANDO_FORMAT_VERSION, manifestFor } from "./glissando-manifest";
import { readManifest } from "./read-manifest";
import { FILL_SCREEN_PORTRAIT_PICTURES } from "../library/portrait-pictures";
import type { StoredSlideshow } from "../library/stored-slideshow";

const AUTOMATIC: StoredSlideshow = {
  id: "show-1",
  title: "Herbst in Wien",
  createdAt: "2025-10-01T08:00:00.000Z",
  pictures: [
    {
      id: "p1",
      capturedAt: "2025-09-30T10:00:00Z",
      width: 30,
      height: 40,
      fileName: "a.jpg",
      colours: { veil: "#404040", accent: "#C0C0C0" },
    },
    {
      id: "p2",
      capturedAt: "2025-09-30T11:00:00Z",
      width: 30,
      height: 40,
      fileName: "b.jpg",
      alone: true,
      colours: { veil: "#404040", accent: "#C0C0C0" },
    },
  ],
  songs: [],
  secondsPerPicture: 5,
};
const FILL_SCREEN: StoredSlideshow = {
  ...AUTOMATIC,
  portraitPictures: FILL_SCREEN_PORTRAIT_PICTURES,
};

const JPEG = { display: "image/jpeg", thumbnail: "image/jpeg" };
const fillScreenManifest = () => manifestFor(FILL_SCREEN, [JPEG, JPEG]);

describe("portraitPictures and a picture's alone in the .glissando file (ADR-0028)", () => {
  it("writes the slideshow's layout from the version that carries it", () => {
    expect(fillScreenManifest().formatVersion).toBe(GLISSANDO_FORMAT_VERSION);
    expect(fillScreenManifest().slideshow).toMatchObject({ portraitPictures: "fill-screen" });
  });

  it("is absent while the layout is automatic", () => {
    expect(manifestFor(AUTOMATIC, [JPEG, JPEG]).slideshow).not.toHaveProperty("portraitPictures");
  });

  it("writes a picture marked alone, and omits it for one that may be paired", () => {
    const written = fillScreenManifest();
    expect(written.slideshow.pictures[1]).toMatchObject({ alone: true });
    expect(written.slideshow.pictures[0]).not.toHaveProperty("alone");
  });

  it("reads back as written", () => {
    expect(readManifest(JSON.stringify(fillScreenManifest()))).toEqual({
      kind: "ok",
      manifest: fillScreenManifest(),
    });
  });

  it("names a portraitPictures value that is no choice, its path and what is expected", () => {
    const written = fillScreenManifest();
    const text = JSON.stringify({
      ...written,
      slideshow: { ...written.slideshow, portraitPictures: "cropped" },
    });

    expect(readManifest(text)).toEqual({
      kind: "damaged",
      reason:
        'glissando.json slideshow.portraitPictures: expected one of one-at-a-time, fill-screen, got "cropped"',
    });
  });

  it("refuses an alone value that is not true", () => {
    const written = fillScreenManifest();
    const text = JSON.stringify({
      ...written,
      slideshow: {
        ...written.slideshow,
        pictures: [
          { ...written.slideshow.pictures[0], alone: false },
          written.slideshow.pictures[1],
        ],
      },
    });

    expect(readManifest(text)).toEqual({
      kind: "damaged",
      reason: "glissando.json slideshow.pictures[0].alone: expected true or absent, got false",
    });
  });
});
