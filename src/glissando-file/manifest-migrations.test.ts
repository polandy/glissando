import { describe, expect, it } from "vitest";
import { GREY_PICTURE_COLOURS } from "../library/picture-colours";
import { DEFAULT_CARD_TINT } from "../library/stored-card";
import { CARD_ENTRANCE_BEFORE_ENTRANCES, migrateSlideshow } from "./manifest-migrations";
import { DocumentFormatError } from "./document-values";

const PATH = "slideshow";

const picture = { file: "pictures/0001.png", capturedAt: "2025-09-12T10:00:00Z" };

describe("migrateSlideshow", () => {
  it("rounds a version 4 music's length up to whole milliseconds", () => {
    const music = { file: "music/track.mp3", durationMs: 1234.5 };
    expect(migrateSlideshow({ pictures: [picture], music }, 4, PATH)).toMatchObject({
      songs: [{ durationMs: 1235 }],
    });
  });

  it("turns a version 9 slideshow's one music into a playlist of that song", () => {
    const music = { file: "music/track.mp3", fileName: "song.mp3" };
    const migrated = migrateSlideshow({ pictures: [picture], music }, 9, PATH);
    expect(migrated).toMatchObject({ songs: [music] });
    expect(migrated).not.toHaveProperty("music");
  });

  it("gives a version 9 slideshow without music an empty playlist", () => {
    expect(migrateSlideshow({ pictures: [picture] }, 9, PATH)).toMatchObject({ songs: [] });
  });

  it("gives a version 12 picture grey colours", () => {
    expect(migrateSlideshow({ pictures: [picture], songs: [] }, 12, PATH)).toMatchObject({
      pictures: [{ ...picture, colours: GREY_PICTURE_COLOURS }],
    });
  });

  it("gives a version 12 card the entrance and a picture background the tint it lacked", () => {
    const card = {
      title: "Herbst",
      background: { kind: "picture", pictureIndex: 0, fade: 60 },
    };
    const colourCard = { title: "Ende", background: { kind: "colour", colour: "plum" } };
    const migrated = migrateSlideshow(
      { pictures: [picture], songs: [], openingCard: card, closingCard: colourCard },
      12,
      PATH,
    );
    expect(migrated).toMatchObject({
      openingCard: {
        entrance: CARD_ENTRANCE_BEFORE_ENTRANCES,
        background: { ...card.background, tint: DEFAULT_CARD_TINT },
      },
      closingCard: { entrance: CARD_ENTRANCE_BEFORE_ENTRANCES, background: colourCard.background },
    });
  });

  it("leaves a version 13 slideshow as it is", () => {
    const show = { pictures: [picture], songs: [] };
    expect(migrateSlideshow(show, 13, PATH)).toBe(show);
  });

  it.each([
    ["songs", { pictures: [picture], songs: [] }, 9, "slideshow.songs"],
    ["colours", { pictures: [{ ...picture, colours: {} }], songs: [] }, 12, "pictures[0].colours"],
    [
      "entrance",
      { pictures: [picture], songs: [], openingCard: { entrance: "rise" } },
      12,
      "openingCard.entrance",
    ],
    [
      "tint",
      {
        pictures: [picture],
        songs: [],
        closingCard: { background: { kind: "picture", tint: "dark" } },
      },
      12,
      "closingCard.background.tint",
    ],
  ])("refuses %s in a slideshow older than the version that added it", (_, show, version, at) => {
    expect(() => migrateSlideshow(show, version, PATH)).toThrow(DocumentFormatError);
    expect(() => migrateSlideshow(show, version, PATH)).toThrow(at);
  });

  it("leaves a slideshow that is no object for the reader to refuse", () => {
    expect(migrateSlideshow("none", 1, PATH)).toBe("none");
  });
});
