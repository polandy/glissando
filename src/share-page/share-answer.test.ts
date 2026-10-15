import { describe, expect, it } from "vitest";
import { DocumentFormatError } from "../glissando-file/document-values";
import { pictureKey, songKey } from "../html-export/page-contract";
import { readShareAnswer } from "./share-answer";

const BEATS = { kind: "beats", beatsMs: [0, 500, 1000], beatsPerMinute: 120 };

function answer(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    revision: 7,
    slideshow: {
      title: "Lake Garda",
      createdAt: "2026-07-02T10:00:00Z",
      secondsPerPicture: 4,
      pictures: [
        {
          capturedAt: "2026-07-01T00:00:00.000Z",
          width: 1600,
          height: 900,
          caption: "Arrival",
          colours: { veil: "#404040", accent: "#C0C0C0" },
        },
        {
          capturedAt: "2026-07-01T00:00:00Z",
          width: 900,
          height: 1600,
          durationMs: 2500,
          colours: { veil: "#404040", accent: "#C0C0C0" },
        },
      ],
      songs: [{ durationMs: 90_000, mimeType: "audio/mpeg" }],
    },
    beats: [BEATS],
    ...overrides,
  };
}

describe("readShareAnswer", () => {
  it("names each picture and song by its position, as the page asks for them", () => {
    const read = readShareAnswer(answer());

    expect(read.revision).toBe(7);
    expect(read.slideshow.title).toBe("Lake Garda");
    expect(read.slideshow.pictures.map(({ id }) => id)).toEqual([pictureKey(0), pictureKey(1)]);
    expect(read.slideshow.pictures[0]?.caption).toBe("Arrival");
    expect(read.slideshow.pictures[1]?.durationMs).toBe(2500);
    expect(read.slideshow.songs.map(({ id }) => id)).toEqual([songKey(0)]);
    expect(read.slideshow.songs[0]?.mimeType).toBe("audio/mpeg");
  });

  it("keeps the beats of each song that has them, by the song's key", () => {
    const withSong = answer();
    const twoSongs = answer({
      slideshow: {
        ...(withSong["slideshow"] as object),
        songs: [
          { durationMs: 90_000, mimeType: "audio/mpeg" },
          { durationMs: 60_000, mimeType: "audio/mpeg" },
        ],
      },
      beats: [null, BEATS],
    });

    const read = readShareAnswer(twoSongs);

    expect([...read.beats.keys()]).toEqual([songKey(1)]);
    expect(read.beats.get(songKey(1))).toEqual(BEATS);
  });

  it.each([
    { what: "a revision that is no whole number", overrides: { revision: "7" } },
    { what: "beats not one per song", overrides: { beats: [] } },
    { what: "beats that are no beats", overrides: { beats: [{ bpm: "fast" }] } },
    { what: "an unknown key", overrides: { extra: true } },
  ])("refuses an answer with $what", ({ overrides }) => {
    expect(() => readShareAnswer(answer(overrides))).toThrow(DocumentFormatError);
  });

  it("refuses a picture that carries an Immich id, which the share document never holds", () => {
    const withId = answer();
    const slideshow = withId["slideshow"] as { pictures: Record<string, unknown>[] };
    const [first] = slideshow.pictures;
    if (first === undefined) throw new Error("the fixture has no picture");
    first["immichAssetId"] = "6f1c0a52-0000-4000-8000-000000000000";

    expect(() => readShareAnswer(withId)).toThrow(/immichAssetId/);
  });
});
