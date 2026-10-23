import { describe, expect, it } from "vitest";
import { GLISSANDO_FORMAT_VERSION, PLACE_FROM_VERSION, manifestFor } from "./glissando-manifest";
import { readManifest } from "./read-manifest";
import type { StoredSlideshow } from "../library/stored-slideshow";

const LISBON = { name: "Lisbon", latitude: 38.717, longitude: -9.133 };

const slideshow: StoredSlideshow = {
  id: "show-1",
  title: "Lisboa",
  createdAt: "2025-10-01T08:00:00.000Z",
  pictures: [
    {
      id: "p1",
      capturedAt: "2025-09-30T10:00:00Z",
      width: 3840,
      height: 2160,
      fileName: "a.jpg",
      place: LISBON,
      colours: { veil: "#404040", accent: "#C0C0C0" },
    },
    {
      id: "p2",
      capturedAt: "2025-09-30T11:00:00Z",
      width: 2160,
      height: 3840,
      fileName: "b.jpg",
      colours: { veil: "#404040", accent: "#C0C0C0" },
    },
  ],
  songs: [],
  secondsPerPicture: 5,
};

const JPEG = { display: "image/jpeg", thumbnail: "image/jpeg" };
const manifest = () => manifestFor(slideshow, [JPEG, JPEG]);
const asText = (value: unknown): string => JSON.stringify(value);

/** The written manifest with picture `index` changed and `formatVersion` set. */
function withPicture(
  index: 0 | 1,
  change: Record<string, unknown>,
  formatVersion = GLISSANDO_FORMAT_VERSION,
): string {
  const written = manifest();
  const pictures = written.slideshow.pictures.map((picture, i) =>
    i === index ? { ...picture, ...change } : picture,
  );
  return asText({ ...written, formatVersion, slideshow: { ...written.slideshow, pictures } });
}

describe("a picture's resolved place in the .glissando file", () => {
  it("is written from format version 17, the version that carries it", () => {
    expect(PLACE_FROM_VERSION).toBe(17);
    expect(manifest().slideshow.pictures[0]).toMatchObject({ place: LISBON });
    expect(manifest().slideshow.pictures[1]).not.toHaveProperty("place");
  });

  it("reads back as written", () => {
    expect(readManifest(asText(manifest()))).toEqual({ kind: "ok", manifest: manifest() });
  });

  it("refuses a place in a version 16 file, older than this app still reads", () => {
    const text = withPicture(0, {}, 16);

    expect(readManifest(text).kind).toBe("damaged");
  });

  it.each([
    ["missing name", { latitude: 38.717, longitude: -9.133 }],
    ["an empty name", { name: "", latitude: 38.717, longitude: -9.133 }],
    ["latitude below -90", { name: "Lisbon", latitude: -90.1, longitude: -9.133 }],
    ["latitude above 90", { name: "Lisbon", latitude: 90.1, longitude: -9.133 }],
    ["longitude below -180", { name: "Lisbon", latitude: 38.717, longitude: -180.1 }],
    ["longitude above 180", { name: "Lisbon", latitude: 38.717, longitude: 180.1 }],
    ["an unknown field", { name: "Lisbon", latitude: 38.717, longitude: -9.133, country: "PT" }],
  ])("takes a place with %s for a damaged file", (_, place) => {
    expect(readManifest(withPicture(0, { place })).kind).toBe("damaged");
  });
});
