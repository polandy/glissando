import { describe, expect, it } from "vitest";
import type { StoredSlideshow } from "../library/stored-slideshow";
import { manifestFor } from "./glissando-manifest";
import { readManifest } from "./read-manifest";

const JPEG = { display: "image/jpeg", thumbnail: "image/jpeg" };

const picture = (id: string, fileName: string): StoredSlideshow["pictures"][number] => ({
  id,
  capturedAt: "2025-09-30T10:00:00Z",
  width: 40,
  height: 30,
  fileName,
  colours: { veil: "#404040", accent: "#C0C0C0" },
});

const twoPictures: StoredSlideshow = {
  id: "show-1",
  title: "Herbst in Wien",
  createdAt: "2025-10-01T08:00:00.000Z",
  pictures: [picture("p1", "a.jpg"), picture("p2", "b.jpg")],
  songs: [],
  secondsPerPicture: 5,
};

const written = manifestFor(twoPictures, [JPEG, JPEG]);
const [first, second] = written.slideshow.pictures;
const asText = (pictures: unknown): string =>
  JSON.stringify({ ...written, slideshow: { ...written.slideshow, pictures } });

describe("repeated picture paths in the .glissando file", () => {
  it("refuses two pictures at the same file path, naming the second and its path", () => {
    const text = asText([first, { ...second, file: first?.file }]);

    expect(readManifest(text)).toEqual({
      kind: "damaged",
      reason: `glissando.json slideshow.pictures[1].file: expected a path no other picture uses, got ${JSON.stringify(first?.file)}`,
    });
  });

  it("refuses two pictures with the same thumbnail path, naming the second and its path", () => {
    const text = asText([first, { ...second, thumbnail: first?.thumbnail }]);

    expect(readManifest(text)).toEqual({
      kind: "damaged",
      reason: `glissando.json slideshow.pictures[1].thumbnail: expected a path no other thumbnail uses, got ${JSON.stringify(first?.thumbnail)}`,
    });
  });
});
