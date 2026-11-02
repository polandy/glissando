import { describe, expect, it } from "vitest";
import { composeSlideshow } from "../../compose";
import { NO_SONG_BEATS } from "../../compose/playlist";
import { NO_SONG_LOUDNESS } from "../../compose/song-loudness";
import type { StoredPicture, StoredSlideshow } from "../../library/stored-slideshow";
import { FROM_THE_START, playStart } from "./play-start";
import { slideBoundaries } from "./slide-boundaries";

const LANDSCAPE = { width: 400, height: 300 };
const PORTRAIT = { width: 300, height: 400 };
const IDS = ["p1", "p2", "p3", "p4"];

function picture(id: string, size: { width: number; height: number }): StoredPicture {
  return {
    id,
    capturedAt: "2025-07-01T10:00:00Z",
    fileName: `${id}.jpg`,
    ...size,
    colours: { veil: "#404040", accent: "#C0C0C0" },
  };
}

/** The slides of p1, then p2 and p3 as a portrait pair, then p4. */
const SLIDESHOW = composeSlideshow(
  {
    id: "show",
    title: "July 2025",
    createdAt: "2025-07-21T00:00:00Z",
    pictures: [
      picture("p1", LANDSCAPE),
      picture("p2", PORTRAIT),
      picture("p3", PORTRAIT),
      picture("p4", LANDSCAPE),
    ],
    songs: [],
    secondsPerPicture: 5,
  } satisfies StoredSlideshow,
  { picture: (id) => id, music: (id) => id, video: (id) => id },
  new Map(),
  NO_SONG_BEATS,
  NO_SONG_LOUDNESS,
  "en",
);
const { starts } = slideBoundaries(SLIDESHOW);

describe("playStart", () => {
  it.each([
    ["the first picture, from the start", "p1", 0],
    ["a middle picture, where its slide starts", "p4", 2],
    ["a pair's first picture, where the pair starts", "p2", 1],
    ["a pair's second picture, where the pair starts", "p3", 1],
  ])("plays %s", (_, pictureId, slide) => {
    const start = playStart(SLIDESHOW, IDS, pictureId);

    expect(start).toEqual({ slide, seconds: starts[slide] });
  });

  it("starts later than the beginning for a later picture", () => {
    expect(playStart(SLIDESHOW, IDS, "p4").seconds).toBeGreaterThan(0);
  });

  it.each([
    ["no picture chosen", null],
    ["a picture not played", "gone"],
  ])("plays from the start for %s", (_, pictureId) => {
    expect(playStart(SLIDESHOW, IDS, pictureId)).toEqual(FROM_THE_START);
  });
});
