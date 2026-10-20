import Ajv from "ajv";
import { describe, expect, it } from "vitest";
import { readManifest } from "./read-manifest";
import {
  BASE_MANIFEST,
  validateManifestSchema,
  withAt,
  withoutAt,
} from "./testing/manifest-schema-fixtures";
import { MANIFEST_SCHEMA } from "./manifest-schema";
import { exportedFile, EXPORTED_SLIDESHOW } from "./testing/glissando-fixtures";
import { readEntry, readZipDirectory } from "./zip-reader";

/** The smallest manifest `readManifest` accepts: every optional key, at every level, absent. */
const MINIMAL_MANIFEST = {
  format: "glissando",
  formatVersion: 15,
  slideshow: {
    title: "T",
    createdAt: "2025-01-01T00:00:00Z",
    secondsPerPicture: 5,
    pictures: [
      {
        file: "pictures/0001.png",
        capturedAt: "2025-01-01T00:00:00Z",
        width: 10,
        height: 10,
        fileName: "a.jpg",
        colours: { veil: "#000000", accent: "#FFFFFF" },
      },
    ],
    songs: [],
  },
};

function expectBothAccept(doc: unknown): void {
  expect(validateManifestSchema(doc)).toBe(true);
  expect(readManifest(JSON.stringify(doc)).kind).toBe("ok");
}

function expectBothRefuse(doc: unknown): void {
  expect(validateManifestSchema(doc)).toBe(false);
  expect(readManifest(JSON.stringify(doc)).kind).not.toBe("ok");
}

describe("MANIFEST_SCHEMA: valid manifests", () => {
  it.each([
    ["every optional key present", BASE_MANIFEST],
    ["every optional key absent", MINIMAL_MANIFEST],
    [
      "secondsPerPicture at its minimum",
      withAt(MINIMAL_MANIFEST, ["slideshow", "secondsPerPicture"], 2),
    ],
    [
      "secondsPerPicture at its maximum",
      withAt(MINIMAL_MANIFEST, ["slideshow", "secondsPerPicture"], 15),
    ],
  ])("%s is accepted by both the reader and the schema", (_name, doc) => {
    expectBothAccept(doc);
  });
});

describe("MANIFEST_SCHEMA: root and slideshow, broken manifests", () => {
  it.each([
    ["root: missing format", withoutAt(BASE_MANIFEST, ["format"])],
    ["root: missing formatVersion", withoutAt(BASE_MANIFEST, ["formatVersion"])],
    ["root: missing slideshow", withoutAt(BASE_MANIFEST, ["slideshow"])],
    ["root: an unknown key", withAt(BASE_MANIFEST, ["extra"], true)],
    ["root: format of the wrong type", withAt(BASE_MANIFEST, ["format"], 123)],
    ["root: formatVersion of the wrong type", withAt(BASE_MANIFEST, ["formatVersion"], "15")],
    ["root: slideshow of the wrong type", withAt(BASE_MANIFEST, ["slideshow"], "oops")],
    ["slideshow: missing title", withoutAt(MINIMAL_MANIFEST, ["slideshow", "title"])],
    ["slideshow: missing createdAt", withoutAt(MINIMAL_MANIFEST, ["slideshow", "createdAt"])],
    [
      "slideshow: missing secondsPerPicture",
      withoutAt(MINIMAL_MANIFEST, ["slideshow", "secondsPerPicture"]),
    ],
    ["slideshow: missing pictures", withoutAt(MINIMAL_MANIFEST, ["slideshow", "pictures"])],
    ["slideshow: missing songs", withoutAt(MINIMAL_MANIFEST, ["slideshow", "songs"])],
    ["slideshow: an unknown key", withAt(MINIMAL_MANIFEST, ["slideshow", "extra"], true)],
    ["slideshow: title of the wrong type", withAt(MINIMAL_MANIFEST, ["slideshow", "title"], 5)],
    [
      "slideshow: createdAt not a date-time's shape",
      withAt(MINIMAL_MANIFEST, ["slideshow", "createdAt"], "not-a-date"),
    ],
    [
      "slideshow: secondsPerPicture of the wrong type",
      withAt(MINIMAL_MANIFEST, ["slideshow", "secondsPerPicture"], "5"),
    ],
    [
      "slideshow: pictures of the wrong type",
      withAt(MINIMAL_MANIFEST, ["slideshow", "pictures"], {}),
    ],
    [
      "slideshow: songs of the wrong type",
      withAt(MINIMAL_MANIFEST, ["slideshow", "songs"], "none"),
    ],
    ["slideshow: pictures empty", withAt(MINIMAL_MANIFEST, ["slideshow", "pictures"], [])],
    [
      "slideshow: secondsPerPicture just below its minimum",
      withAt(MINIMAL_MANIFEST, ["slideshow", "secondsPerPicture"], 1.9),
    ],
    [
      "slideshow: secondsPerPicture just above its maximum",
      withAt(MINIMAL_MANIFEST, ["slideshow", "secondsPerPicture"], 15.1),
    ],
    ["slideshow: ownOrder false", withAt(MINIMAL_MANIFEST, ["slideshow", "ownOrder"], false)],
    [
      "slideshow: transition an outsider",
      withAt(MINIMAL_MANIFEST, ["slideshow", "transition"], "nonsense"),
    ],
    [
      "slideshow: betweenSongs an outsider",
      withAt(MINIMAL_MANIFEST, ["slideshow", "betweenSongs"], "nonsense"),
    ],
    [
      "slideshow: pictureLength an outsider",
      withAt(MINIMAL_MANIFEST, ["slideshow", "pictureLength"], "nonsense"),
    ],
    [
      "slideshow: portraitPictures an outsider",
      withAt(MINIMAL_MANIFEST, ["slideshow", "portraitPictures"], "nonsense"),
    ],
  ])("%s is refused by both the reader and the schema", (_name, doc) => {
    expectBothRefuse(doc);
  });
});

describe("MANIFEST_SCHEMA: proves the sync table can fail", () => {
  it("a loosened secondsPerPicture bound lets the schema accept what the reader still refuses", () => {
    const tooLong = withAt(MINIMAL_MANIFEST, ["slideshow", "secondsPerPicture"], 15.1);
    expect(readManifest(JSON.stringify(tooLong)).kind).not.toBe("ok");
    expect(validateManifestSchema(tooLong)).toBe(false);

    const slideshowSchema = MANIFEST_SCHEMA.properties?.["slideshow"];
    const loosenedSchema = {
      ...MANIFEST_SCHEMA,
      properties: {
        ...MANIFEST_SCHEMA.properties,
        slideshow: {
          ...slideshowSchema,
          properties: {
            ...slideshowSchema?.properties,
            secondsPerPicture: { type: "number", minimum: 2, maximum: 16 },
          },
        },
      },
    };
    const loosenedValidate = new Ajv().compile(loosenedSchema);
    expect(loosenedValidate(tooLong)).toBe(true);
  });
});

describe("the exported .glissando file", () => {
  it("writes its schema and README right after the manifest, and its manifest validates", async () => {
    const file = await exportedFile(EXPORTED_SLIDESHOW);
    const entries = (await readZipDirectory(file)) ?? [];
    const names = entries.map((entry) => entry.name).slice(0, 3);
    expect(names).toEqual(["glissando.json", "glissando.schema.json", "README.txt"]);

    const manifestEntry = entries.find((entry) => entry.name === "glissando.json");
    if (manifestEntry === undefined) {
      throw new Error("the exported file has no glissando.json");
    }
    const read = await readEntry(file, manifestEntry);
    if (read.kind !== "ok") {
      throw new Error(`glissando.json does not read: ${read.reason}`);
    }
    const manifest = JSON.parse(await read.data.text());
    expect(validateManifestSchema(manifest)).toBe(true);
  });
});
