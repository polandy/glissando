import { describe, expect, it } from "vitest";
import { readManifest } from "./read-manifest";
import { BASE_MANIFEST, validateManifestSchema, withAt } from "./testing/manifest-schema-fixtures";

/**
 * Rules JSON Schema cannot express, named in `MANIFEST_SCHEMA`'s `description` and proved here:
 * each case is a manifest the schema accepts but `readManifest` still refuses.
 */
describe("reader-only rules: accepted by the schema, refused by the reader", () => {
  it.each([
    [
      "two songs at the same file path",
      withAt(
        BASE_MANIFEST,
        ["slideshow", "songs"],
        [BASE_MANIFEST.slideshow.songs[0], BASE_MANIFEST.slideshow.songs[0]],
      ),
    ],
    [
      "a card background's pictureIndex at or past the picture count",
      withAt(BASE_MANIFEST, ["slideshow", "closingCard", "background", "pictureIndex"], 5),
    ],
    [
      "two slides' clips sharing a file but not a mimeType",
      withAt(BASE_MANIFEST, ["slideshow", "pictures", 1, "video"], {
        file: "videos/clip-1.mp4",
        mimeType: "video/webm",
        sourceMs: 20_000,
        startMs: 0,
        endMs: 4000,
      }),
    ],
    [
      "createdAt matching the date-time shape but not a real calendar time",
      withAt(BASE_MANIFEST, ["slideshow", "createdAt"], "2025-01-01T25:00:00Z"),
    ],
    [
      "a caption past the 80-grapheme limit",
      withAt(BASE_MANIFEST, ["slideshow", "pictures", 0, "caption"], "a".repeat(81)),
    ],
    [
      "a music trim longer than the track's own durationMs",
      withAt(BASE_MANIFEST, ["slideshow", "songs", 0, "trim"], { startMs: 0, endMs: 290_000 }),
    ],
    [
      "a video excerpt shorter than its 500 ms minimum",
      withAt(BASE_MANIFEST, ["slideshow", "pictures", 0, "video", "endMs"], 1200),
    ],
    [
      "a chapter edit's pictureIndex at or past the picture count",
      withAt(BASE_MANIFEST, ["slideshow", "chapterEdits", 0, "pictureIndex"], 5),
    ],
    [
      "two chapter edits naming the same picture",
      withAt(
        BASE_MANIFEST,
        ["slideshow", "chapterEdits"],
        [
          { pictureIndex: 0, title: "Lisbon" },
          { pictureIndex: 0, title: "Sintra" },
        ],
      ),
    ],
    [
      "a chapter title past the 80-grapheme limit",
      withAt(BASE_MANIFEST, ["slideshow", "chapterEdits", 0, "title"], "a".repeat(81)),
    ],
  ])("%s", (_name, doc) => {
    expect(validateManifestSchema(doc)).toBe(true);
    expect(readManifest(JSON.stringify(doc)).kind).not.toBe("ok");
  });
});
