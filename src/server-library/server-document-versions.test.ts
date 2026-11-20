import { describe, expect, it } from "vitest";
import { GREY_PICTURE_COLOURS } from "../library/picture-colours";
import { DEFAULT_CARD_TINT } from "../library/stored-card";
import { CARD_ENTRANCE_BEFORE_ENTRANCES } from "../glissando-file/manifest-migrations";
import {
  OLDEST_SERVER_DOCUMENT_FORMAT_VERSION,
  SERVER_DOCUMENT_FORMAT_VERSION,
  readServerDocument,
} from "./server-document";
import { readFails, without } from "./server-document-fixtures";

/** Each fixture is a document as that server document version was written (ADR-0059). */
const FIXTURES = import.meta.glob<string>("./testing/server-format-versions/server-format-*.json", {
  eager: true,
  query: "?raw",
  import: "default",
});

const VERSIONS = Array.from(
  { length: SERVER_DOCUMENT_FORMAT_VERSION - OLDEST_SERVER_DOCUMENT_FORMAT_VERSION + 1 },
  (_, index) => OLDEST_SERVER_DOCUMENT_FORMAT_VERSION + index,
);

function fixture(name: string): Record<string, unknown> {
  const text = FIXTURES[`./testing/server-format-versions/server-format-${name}.json`];
  if (text === undefined) {
    throw new Error(`server document version ${name} has no fixture: add one`);
  }
  return JSON.parse(text) as Record<string, unknown>;
}

const versionName = (version: number): string => String(version).padStart(2, "0");

function withSlideshow(name: string, change: Record<string, unknown>): unknown {
  const document = fixture(name);
  return { ...document, slideshow: { ...(document["slideshow"] as object), ...change } };
}

describe("reading an older server document", () => {
  it.each(VERSIONS)("opens version %i as the current version", (version) => {
    const read = readServerDocument(fixture(versionName(version)));

    expect(read.formatVersion).toBe(SERVER_DOCUMENT_FORMAT_VERSION);
    expect(read.slideshow.title).toBe(`Server format version ${version}`);
    expect(read.slideshow.pictures.length).toBeGreaterThan(0);
  });

  it("reads the current version's fixture exactly as stored", () => {
    const stored = fixture(versionName(SERVER_DOCUMENT_FORMAT_VERSION));

    expect(readServerDocument(stored)).toEqual(stored);
  });

  it("turns a version 1 slideshow's one music into a playlist of that song", () => {
    const { music } = fixture("01")["slideshow"] as { music: object };

    const read = readServerDocument(fixture("01"));

    expect(read.slideshow.songs).toEqual([music]);
    expect(read.slideshow).not.toHaveProperty("music");
  });

  it("reads a version 1 slideshow that already carried a playlist", () => {
    const { songs } = fixture("01-songs")["slideshow"] as { songs: unknown[] };

    expect(readServerDocument(fixture("01-songs")).slideshow.songs).toEqual(songs);
  });

  it("gives a version 1 slideshow without music an empty playlist", () => {
    const document = fixture("01");
    const show = without(document["slideshow"] as object, "music");

    expect(readServerDocument({ ...document, slideshow: show }).slideshow.songs).toEqual([]);
  });

  it("refuses a version 1 slideshow with both a music and a playlist", () => {
    expect(readFails(withSlideshow("01", { songs: [] }))).toContain("slideshow.songs");
  });

  it.each([1, 2])("gives a version %i picture grey colours", (version) => {
    const read = readServerDocument(fixture(versionName(version)));

    for (const picture of read.slideshow.pictures) {
      expect(picture.colours).toEqual(GREY_PICTURE_COLOURS);
    }
  });

  it("gives a version 2 card the entrance and a picture background the tint it lacked", () => {
    const { openingCard, closingCard } = readServerDocument(fixture("02")).slideshow;

    expect(openingCard).toMatchObject({
      entrance: CARD_ENTRANCE_BEFORE_ENTRANCES,
      background: { kind: "picture", tint: DEFAULT_CARD_TINT },
    });
    expect(closingCard).toMatchObject({ entrance: CARD_ENTRANCE_BEFORE_ENTRANCES });
  });

  it.each([
    ["01-songs", { openingCard: { title: "Herbst" } }, "openingCard"],
    ["03", { look: "warm" }, "look"],
    ["04", { mood: "calm" }, "mood"],
    ["05", { energyPacing: true }, "energyPacing"],
    ["06", { repeatMusic: true }, "repeatMusic"],
  ])("refuses in version %s a field only a later version carries", (name, change, reason) => {
    expect(readFails(withSlideshow(name, change))).toContain(reason);
  });

  it.each([0, SERVER_DOCUMENT_FORMAT_VERSION + 1, 1.5, "1"])(
    "refuses format version %j, naming the versions it reads",
    (formatVersion) => {
      expect(readFails({ ...fixture("01"), formatVersion })).toContain(
        `formatVersion: expected a whole number from ${OLDEST_SERVER_DOCUMENT_FORMAT_VERSION} to ${SERVER_DOCUMENT_FORMAT_VERSION}`,
      );
    },
  );
});
