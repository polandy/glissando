import { describe, expect, it } from "vitest";
import { readManifest } from "./read-manifest";
import {
  BASE_MANIFEST,
  validateManifestSchema,
  withAt,
  withoutAt,
} from "./testing/manifest-schema-fixtures";

const song0 = ["slideshow", "songs", 0] as const;

function expectBothRefuse(doc: unknown): void {
  expect(validateManifestSchema(doc)).toBe(false);
  expect(readManifest(JSON.stringify(doc)).kind).not.toBe("ok");
}

describe("MUSIC_SCHEMA: broken songs", () => {
  it.each([
    ["missing file", withoutAt(BASE_MANIFEST, [...song0, "file"])],
    ["missing fileName", withoutAt(BASE_MANIFEST, [...song0, "fileName"])],
    ["missing durationMs", withoutAt(BASE_MANIFEST, [...song0, "durationMs"])],
    ["missing mimeType", withoutAt(BASE_MANIFEST, [...song0, "mimeType"])],
    ["an unknown key", withAt(BASE_MANIFEST, [...song0, "extra"], true)],
    ["fileName of the wrong type", withAt(BASE_MANIFEST, [...song0, "fileName"], 5)],
    ["durationMs of the wrong type", withAt(BASE_MANIFEST, [...song0, "durationMs"], "240000")],
    ["durationMs zero", withAt(BASE_MANIFEST, [...song0, "durationMs"], 0)],
    ["pictureChanges an outsider", withAt(BASE_MANIFEST, [...song0, "pictureChanges"], "nonsense")],
    ["fadeInMs below its minimum", withAt(BASE_MANIFEST, [...song0, "fadeInMs"], -1)],
    ["fadeInMs above its maximum", withAt(BASE_MANIFEST, [...song0, "fadeInMs"], 10_001)],
    ["fadeOutMs off the 500 ms step", withAt(BASE_MANIFEST, [...song0, "fadeOutMs"], 5100)],
    ["volumeDb below its minimum", withAt(BASE_MANIFEST, [...song0, "volumeDb"], -13)],
    ["volumeDb above its maximum", withAt(BASE_MANIFEST, [...song0, "volumeDb"], 7)],
    ["volumeDb not a whole number", withAt(BASE_MANIFEST, [...song0, "volumeDb"], 1.5)],
    ["trim: missing endMs", withoutAt(BASE_MANIFEST, [...song0, "trim", "endMs"])],
    ["trim: missing startMs", withoutAt(BASE_MANIFEST, [...song0, "trim", "startMs"])],
    ["trim: an unknown key", withAt(BASE_MANIFEST, [...song0, "trim", "extra"], true)],
    ["trim.startMs negative", withAt(BASE_MANIFEST, [...song0, "trim", "startMs"], -1)],
    ["trim.startMs of the wrong type", withAt(BASE_MANIFEST, [...song0, "trim", "startMs"], "0")],
  ])("%s is refused by both the reader and the schema", (_name, doc) => {
    expectBothRefuse(doc);
  });
});
