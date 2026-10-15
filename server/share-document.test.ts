import { describe, expect, it } from "vitest";
import {
  SERVER_MUSIC_KEYS,
  SERVER_PICTURE_KEYS,
  SERVER_SLIDESHOW_KEYS,
  type ServerMusic,
  type ServerPicture,
  type ServerSlideshow,
} from "../src/server-library/server-document";
import { shareDocumentOf } from "./share-document";

const ASSET_ID = "0b5a7c3e-1f2d-4e6a-9b8c-7d6e5f4a3b2c";
const MUSIC_ID = "00000000-0000-4000-8000-00000000abcd";

const picture = (overrides: Partial<ServerPicture> = {}): ServerPicture => ({
  capturedAt: "2025-09-30T10:00:00Z",
  width: 1920,
  height: 1080,
  fileName: "IMG_0001.jpg",
  immichAssetId: ASSET_ID,
  colours: { veil: "#404040", accent: "#C0C0C0" },
  ...overrides,
});

const song = (overrides: Partial<ServerMusic> = {}): ServerMusic => ({
  musicId: MUSIC_ID,
  fileName: "Our song.m4a",
  durationMs: 60000,
  mimeType: "audio/mp4",
  ...overrides,
});

const slideshow = (overrides: Partial<ServerSlideshow> = {}): ServerSlideshow => ({
  title: "Herbst in Wien",
  createdAt: "2025-10-14T08:00:00.000Z",
  secondsPerPicture: 5,
  pictures: [picture()],
  songs: [song()],
  ...overrides,
});

describe("the share document", () => {
  it("keeps the slideshow's own settings as they are, its creation date cut to its month", () => {
    const shared = shareDocumentOf(
      slideshow({ ownOrder: true, transition: "cut", betweenSongs: "sequence" }),
    );
    expect(shared).toMatchObject({
      title: "Herbst in Wien",
      createdAt: "2025-10-01T00:00:00.000Z",
      secondsPerPicture: 5,
      ownOrder: true,
      transition: "cut",
      betweenSongs: "sequence",
    });
  });

  it("removes each picture's Immich asset id and file name, keeping everything else", () => {
    const kenBurns = {
      from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
      to: { zoom: 1.2, centerX: 0.4, centerY: 0.4 },
    };
    const [shared] = shareDocumentOf(
      slideshow({
        pictures: [picture({ caption: "Am Kahlenberg", durationMs: 4000, kenBurns })],
      }),
    ).pictures;
    expect(shared).toEqual({
      capturedAt: "2025-09-01T00:00:00.000Z",
      width: 1920,
      height: 1080,
      caption: "Am Kahlenberg",
      durationMs: 4000,
      kenBurns,
      colours: { veil: "#404040", accent: "#C0C0C0" },
    });
  });

  it("removes each song's music id and file name, keeping everything else", () => {
    const trim = { startMs: 1000, endMs: 50000 };
    const [shared] = shareDocumentOf(slideshow({ songs: [song({ trim, fadeInMs: 500 })] })).songs;
    expect(shared).toEqual({ durationMs: 60000, mimeType: "audio/mp4", trim, fadeInMs: 500 });
  });

  it.each([
    ["the middle of a month", "2025-09-30T10:00:00Z", "2025-09-01T00:00:00.000Z"],
    ["the first instant of a month", "2025-09-01T00:00:00Z", "2025-09-01T00:00:00.000Z"],
    [
      "an offset that is the month before in UTC",
      "2025-10-01T01:00:00+02:00",
      "2025-09-01T00:00:00.000Z",
    ],
    ["the last instant of a year", "2025-12-31T23:59:59.999Z", "2025-12-01T00:00:00.000Z"],
    ["a date with fractional seconds", "2024-02-29T12:34:56.789Z", "2024-02-01T00:00:00.000Z"],
  ])(
    "cuts a picture's capture date down to the first day of its month in UTC: %s",
    (_, capturedAt, shared) => {
      expect(
        shareDocumentOf(slideshow({ pictures: [picture({ capturedAt })] })).pictures[0]?.capturedAt,
      ).toBe(shared);
    },
  );

  it("cuts the slideshow's creation date down to the first day of its month in UTC", () => {
    expect(shareDocumentOf(slideshow({ createdAt: "2025-11-01T00:30:00+01:00" })).createdAt).toBe(
      "2025-10-01T00:00:00.000Z",
    );
  });

  it("drops a key the format does not know, at every level", () => {
    const unknown = { unknownField: "secret" };
    const shared = shareDocumentOf({
      ...slideshow({
        pictures: [{ ...picture(), ...unknown }],
        songs: [{ ...song(), ...unknown }],
      }),
      ...unknown,
    });
    expect(shared.title).toBe("Herbst in Wien");
    expect(JSON.stringify(shared)).not.toContain("unknownField");
  });

  describe("shares every key of the server document unless it is deliberately removed", () => {
    const MARKER = "marker";
    const removed = {
      slideshow: new Set<string>(),
      picture: new Set(["immichAssetId", "fileName"]),
      song: new Set(["musicId", "fileName"]),
    };
    /** `value` with every one of `keys` set: its own value, or a marker. */
    const withEvery = <Value extends object>(value: Value, keys: readonly string[]): Value =>
      ({
        ...Object.fromEntries(keys.map((key) => [key, MARKER])),
        ...value,
      }) as Value;
    const shared = shareDocumentOf(
      withEvery(
        slideshow({
          pictures: [withEvery(picture(), SERVER_PICTURE_KEYS)],
          songs: [withEvery(song(), SERVER_MUSIC_KEYS)],
        }),
        SERVER_SLIDESHOW_KEYS,
      ),
    );
    const sharedKeys = {
      slideshow: Object.keys(shared),
      picture: Object.keys(shared.pictures[0] ?? {}),
      song: Object.keys(shared.songs[0] ?? {}),
    };
    it.each([
      ...SERVER_SLIDESHOW_KEYS.map((key) => ["slideshow", key] as const),
      ...SERVER_PICTURE_KEYS.map((key) => ["picture", key] as const),
      ...SERVER_MUSIC_KEYS.map((key) => ["song", key] as const),
    ])("the %s's %s", (level, key) => {
      if (removed[level].has(key)) {
        expect(sharedKeys[level]).not.toContain(key);
      } else {
        expect(sharedKeys[level]).toContain(key);
      }
    });
  });

  it("keeps the pictures and songs in their order, so a position addresses each", () => {
    const shared = shareDocumentOf(
      slideshow({
        pictures: [picture({ width: 1 }), picture({ width: 2, immichAssetId: "other" })],
        songs: [song({ durationMs: 1000 }), song({ durationMs: 2000, musicId: "other" })],
      }),
    );
    expect(shared.pictures.map(({ width }) => width)).toEqual([1, 2]);
    expect(shared.songs.map(({ durationMs }) => durationMs)).toEqual([1000, 2000]);
  });

  it("names no asset id, music id or file name anywhere in its JSON", () => {
    const json = JSON.stringify(shareDocumentOf(slideshow()));
    expect(json).toContain("Herbst in Wien");
    for (const secret of [ASSET_ID, MUSIC_ID, "IMG_0001.jpg", "Our song.m4a", "2025-09-30"]) {
      expect(json).not.toContain(secret);
    }
  });
});
