import { describe, expect, it } from "vitest";
import type { StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import { DocumentFormatError } from "../glissando-file/document-values";
import {
  readServerDocument,
  serverDocumentFor,
  storedSlideshowFrom,
  type ServerDocument,
} from "./server-document";

const ASSET_A = "0b5a7c3e-1f2d-4e6a-9b8c-7d6e5f4a3b2c";
const ASSET_B = "1c6b8d4f-2a3e-4f7b-8c9d-8e7f6a5b4c3d";
const MUSIC_ID = "2d7c9e5a-3b4f-4a8c-9dae-9f8a7b6c5d4e";

const slideshow: StoredSlideshow = {
  id: "server-show-1",
  title: "Herbst in Wien",
  createdAt: "2025-10-01T08:00:00.000Z",
  pictures: [
    {
      id: ASSET_A,
      capturedAt: "2025-09-30T10:00:00Z",
      width: 3840,
      height: 2160,
      fileName: "a.jpg",
      caption: "Am Steg",
      immichAssetId: ASSET_A,
    },
    {
      id: ASSET_B,
      capturedAt: "2025-09-30T11:00:00Z",
      width: 2160,
      height: 3840,
      fileName: "b.jpg",
      durationMs: 8000,
      transition: "cut",
      kenBurns: {
        from: { zoom: 2.5, centerX: 0.3, centerY: 0.2 },
        to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
      },
      immichAssetId: ASSET_B,
    },
  ],
  ownOrder: true,
  transition: "alternate",
  music: {
    id: MUSIC_ID,
    fileName: "Walzer.m4a",
    durationMs: 240000,
    mimeType: "audio/mp4",
    fadeInMs: 2000,
  },
  secondsPerPicture: 5,
};

const [firstStoredPicture] = slideshow.pictures as [StoredPicture, ...StoredPicture[]];

/** A copy of `value` without `key`. */
function without(value: object, key: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([name]) => name !== key));
}

const document = (): ServerDocument => serverDocumentFor(slideshow);

/** The written document as JSON, with `change` applied to its slideshow. */
function withSlideshow(change: Record<string, unknown>): unknown {
  const written = document();
  return JSON.parse(JSON.stringify({ ...written, slideshow: { ...written.slideshow, ...change } }));
}

function withFirstPicture(change: Record<string, unknown>): unknown {
  const [first, ...rest] = document().slideshow.pictures;
  return withSlideshow({ pictures: [{ ...first, ...change }, ...rest] });
}

const readFails = (json: unknown): string => {
  try {
    readServerDocument(json);
  } catch (error) {
    if (error instanceof DocumentFormatError) {
      return error.message;
    }
    throw error;
  }
  throw new Error("the document was read as valid");
};

describe("serverDocumentFor", () => {
  it("names the server format and version 1 and links every picture by its Immich asset", () => {
    const written = document();
    expect(written.format).toBe("glissando-server");
    expect(written.formatVersion).toBe(1);
    expect(written.slideshow.pictures[0]).toEqual({
      capturedAt: "2025-09-30T10:00:00Z",
      width: 3840,
      height: 2160,
      fileName: "a.jpg",
      caption: "Am Steg",
      immichAssetId: ASSET_A,
    });
  });

  it("names the music by its musicId, the stored music's id", () => {
    expect(document().slideshow.music).toEqual({
      musicId: MUSIC_ID,
      fileName: "Walzer.m4a",
      durationMs: 240000,
      mimeType: "audio/mp4",
      fadeInMs: 2000,
    });
  });

  it("leaves out a picture's file size, which a linked picture does not have", () => {
    const sized = { ...firstStoredPicture, fileBytes: 4200000 };
    const written = serverDocumentFor({ ...slideshow, pictures: [sized] });
    expect(written.slideshow.pictures[0]).not.toHaveProperty("fileBytes");
  });

  it("refuses a picture without an Immich asset, naming it", () => {
    const { id, capturedAt, width, height, fileName } = firstStoredPicture;
    const devicePicture: StoredPicture = { id, capturedAt, width, height, fileName };
    expect(() => serverDocumentFor({ ...slideshow, pictures: [devicePicture] })).toThrow(
      /picture .*a\.jpg.* has no immichAssetId/,
    );
  });
});

describe("readServerDocument", () => {
  it("reads back what serverDocumentFor wrote", () => {
    expect(readServerDocument(JSON.parse(JSON.stringify(document())))).toEqual(document());
  });

  it.each([
    [
      "another format",
      { format: "glissando" },
      'format: expected "glissando-server", got "glissando"',
    ],
    ["another version", { formatVersion: 2 }, "formatVersion: expected 1, got 2"],
    ["an unknown key", { extra: true }, "extra: expected one of format, formatVersion, slideshow"],
  ])("refuses %s at the root, naming path and value", (_case, change, reason) => {
    expect(readFails({ ...document(), ...change })).toContain(reason);
  });

  it("refuses a document that is no object", () => {
    expect(readFails([])).toBe("root: expected an object, got []");
  });

  it("refuses a picture without an immichAssetId", () => {
    const unlinked = without(document().slideshow.pictures[0] ?? {}, "immichAssetId");
    expect(readFails(withSlideshow({ pictures: [unlinked] }))).toBe(
      "slideshow.pictures[0].immichAssetId: expected a non-empty string, got undefined",
    );
  });

  it("refuses two pictures with the same immichAssetId, naming the second and the id", () => {
    const [first] = document().slideshow.pictures;
    expect(readFails(withSlideshow({ pictures: [first, first] }))).toBe(
      `slideshow.pictures[1].immichAssetId: expected an asset no other picture has, got "${ASSET_A}"`,
    );
  });

  it.each(["file", "thumbnail", "fileBytes"])("refuses a picture's %s", (key) => {
    expect(readFails(withFirstPicture({ [key]: "pictures/0001.jpg" }))).toContain(
      `slideshow.pictures[0].${key}: expected one of`,
    );
  });

  it("refuses music without a musicId", () => {
    const unnamed = without(document().slideshow.music ?? {}, "musicId");
    expect(readFails(withSlideshow({ music: unnamed }))).toBe(
      "slideshow.music.musicId: expected a non-empty string, got undefined",
    );
  });

  it("refuses music named by a file", () => {
    const music = { ...document().slideshow.music, file: "music/track.m4a" };
    expect(readFails(withSlideshow({ music }))).toContain("slideshow.music.file: expected one of");
  });

  it.each([
    [
      { secondsPerPicture: 20 },
      "slideshow.secondsPerPicture: expected a number from 2 to 15, got 20",
    ],
    [{ pictures: [] }, "slideshow.pictures: expected at least one picture, got []"],
    [{ title: " " }, 'slideshow.title: expected a non-empty string, got " "'],
  ])("reads the slideshow with the manifest's field checks: %j", (change, reason) => {
    expect(readFails(withSlideshow(change))).toBe(reason);
  });

  it("reads a picture with the manifest's field checks", () => {
    expect(readFails(withFirstPicture({ durationMs: 8200 }))).toContain(
      "slideshow.pictures[0].durationMs: expected whole milliseconds from 2000 to 15000",
    );
  });
});

describe("storedSlideshowFrom", () => {
  it("is the server slideshow with each picture's id its immichAssetId", () => {
    const stored = storedSlideshowFrom("server-show-1", document());
    expect(stored.pictures.map((picture) => picture.id)).toEqual([ASSET_A, ASSET_B]);
    expect(stored).toEqual(slideshow);
  });

  it("gives the music the id of its musicId", () => {
    expect(storedSlideshowFrom("server-show-1", document()).music?.id).toBe(MUSIC_ID);
  });
});
