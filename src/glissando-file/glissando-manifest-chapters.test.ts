import { describe, expect, it } from "vitest";
import {
  GLISSANDO_FORMAT_VERSION,
  TRIP_CHAPTERS_FROM_VERSION,
  manifestFor,
} from "./glissando-manifest";
import { readManifest } from "./read-manifest";
import type { StoredSlideshow } from "../library/stored-slideshow";

const slideshow: StoredSlideshow = {
  id: "show-1",
  title: "Portugal",
  createdAt: "2025-10-01T08:00:00.000Z",
  pictures: [
    {
      id: "p1",
      capturedAt: "2025-09-30T10:00:00Z",
      width: 3840,
      height: 2160,
      fileName: "a.jpg",
      colours: { veil: "#404040", accent: "#C0C0C0" },
    },
    {
      id: "p2",
      capturedAt: "2025-10-01T10:00:00Z",
      width: 2160,
      height: 3840,
      fileName: "b.jpg",
      colours: { veil: "#404040", accent: "#C0C0C0" },
    },
  ],
  songs: [],
  secondsPerPicture: 5,
  automaticChaptersOff: true,
  chapterEdits: [{ pictureId: "p1", title: "Lisbon", hidden: true }],
  addedChapters: [{ beforePictureId: "p2", title: "Porto", subtitle: "October 1" }],
};

const JPEG = { display: "image/jpeg", thumbnail: "image/jpeg" };
const manifest = () => manifestFor(slideshow, [JPEG, JPEG]);
const asText = (value: unknown): string => JSON.stringify(value);

/** The written manifest with `slideshow` changed and `formatVersion` set. */
function withSlideshow(
  change: Record<string, unknown>,
  formatVersion = GLISSANDO_FORMAT_VERSION,
): string {
  const written = manifest();
  return asText({
    ...written,
    formatVersion,
    slideshow: { ...written.slideshow, ...change },
  });
}

describe("a slideshow's trip chapters in the .glissando file", () => {
  it("is written from format version 17, the version that carries it", () => {
    expect(TRIP_CHAPTERS_FROM_VERSION).toBe(17);
    expect(manifest().slideshow).toMatchObject({
      automaticChaptersOff: true,
      chapterEdits: [{ pictureIndex: 0, title: "Lisbon", hidden: true }],
      addedChapters: [{ beforePictureIndex: 1, title: "Porto", subtitle: "October 1" }],
    });
  });

  it("reads back as written", () => {
    expect(readManifest(asText(manifest()))).toEqual({ kind: "ok", manifest: manifest() });
  });

  it("refuses chapters in a version 16 file, older than this app still reads", () => {
    expect(readManifest(withSlideshow({}, 16)).kind).toBe("damaged");
  });

  it.each([
    [
      "a chapter edit naming a pictureIndex at the picture count",
      { chapterEdits: [{ pictureIndex: 2 }] },
    ],
    ["a chapter edit naming a negative pictureIndex", { chapterEdits: [{ pictureIndex: -1 }] }],
    [
      "two chapter edits naming the same picture",
      { chapterEdits: [{ pictureIndex: 0 }, { pictureIndex: 0, title: "Other" }] },
    ],
    ["a chapter edit with an empty title", { chapterEdits: [{ pictureIndex: 0, title: "" }] }],
    [
      "an added chapter naming a beforePictureIndex at the picture count",
      { addedChapters: [{ beforePictureIndex: 2 }] },
    ],
    [
      "two added chapters naming the same beforePictureIndex",
      { addedChapters: [{ beforePictureIndex: 1 }, { beforePictureIndex: 1, title: "Other" }] },
    ],
    [
      "an added chapter with an empty subtitle",
      { addedChapters: [{ beforePictureIndex: 1, subtitle: "" }] },
    ],
    [
      "automaticChaptersOff set to false, which only true or absent may be",
      { automaticChaptersOff: false },
    ],
    ["an unknown field on a chapter edit", { chapterEdits: [{ pictureIndex: 0, country: "PT" }] }],
  ])("takes %s for a damaged file", (_, change) => {
    expect(readManifest(withSlideshow(change)).kind).toBe("damaged");
  });
});
