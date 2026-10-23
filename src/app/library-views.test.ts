import { describe, expect, it } from "vitest";
import type { StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import { playingMusic, slideshowDetails } from "./library-views";

const COLOURS = { veil: "#404040", accent: "#C0C0C0" };
const stored: StoredSlideshow = {
  id: "show",
  title: "Juli 2025",
  createdAt: "2026-10-08T12:00:00Z",
  pictures: [
    {
      id: "p1",
      capturedAt: "2025-07-01T10:00:00Z",
      width: 300,
      height: 200,
      fileName: "a.jpg",
      colours: COLOURS,
    },
    {
      id: "p2",
      capturedAt: "2025-07-02T10:00:00Z",
      width: 300,
      height: 200,
      fileName: "b.jpg",
      colours: COLOURS,
    },
  ],
  songs: [],
  secondsPerPicture: 4,
};
const music = { id: "m", fileName: "Sommer.mp3", durationMs: 30_000, mimeType: "audio/mpeg" };
const withMusic: StoredSlideshow = { ...stored, songs: [music] };
const urlOf = (id: string) => `url:${id}`;

describe("slideshowDetails", () => {
  it("lists the pictures in play order with their thumbnails", () => {
    expect(slideshowDetails(stored, urlOf)).toEqual({
      title: "Juli 2025",
      coverUrl: "url:p1",
      durationSeconds: 8,
      songCount: 0,
      musicTitle: null,
      musicSeconds: null,
      musicSummary: null,
      ownOrder: false,
      ownMotionCount: 0,
      ownDurationCount: 0,
      ownTransitionCount: 0,
      transition: "crossfade",
      look: "none",
      portraitPictures: "automatic",
      pairCount: 0,
      captionCount: 0,
      capturedFrom: "2025-07-01T10:00:00Z",
      capturedTo: "2025-07-02T10:00:00Z",
      pictures: [
        {
          id: "p1",
          thumbnailUrl: "url:p1",
          capturedAt: "2025-07-01T10:00:00Z",
          colours: COLOURS,
          ownMotion: false,
          ownDurationMs: null,
          ownTransition: null,
          pairedWithNumber: null,
          blurredFill: false,
          alone: false,
        },
        {
          id: "p2",
          thumbnailUrl: "url:p2",
          capturedAt: "2025-07-02T10:00:00Z",
          colours: COLOURS,
          ownMotion: false,
          ownDurationMs: null,
          ownTransition: null,
          pairedWithNumber: null,
          blurredFill: false,
          alone: false,
        },
      ],
    });
  });

  it("pairs two consecutive portrait pictures and counts the pair (ADR-0028)", () => {
    const portrait: StoredSlideshow = {
      ...stored,
      pictures: [
        {
          id: "p1",
          capturedAt: "2025-07-01T10:00:00Z",
          width: 300,
          height: 400,
          fileName: "a.jpg",
          colours: COLOURS,
        },
        {
          id: "p2",
          capturedAt: "2025-07-02T10:00:00Z",
          width: 300,
          height: 400,
          fileName: "b.jpg",
          colours: COLOURS,
        },
      ],
    };

    const details = slideshowDetails(portrait, urlOf);

    expect(details.pairCount).toBe(1);
    expect(details.pictures.map((picture) => picture.pairedWithNumber)).toEqual([2, 1]);
  });

  it("gives a lone portrait picture a blurred fill against the 16:9 reference screen", () => {
    const lone: StoredSlideshow = {
      ...stored,
      pictures: [
        {
          id: "p1",
          capturedAt: "2025-07-01T10:00:00Z",
          width: 300,
          height: 200,
          fileName: "a.jpg",
          colours: COLOURS,
        },
        {
          id: "p2",
          capturedAt: "2025-07-02T10:00:00Z",
          width: 300,
          height: 400,
          fileName: "b.jpg",
          colours: COLOURS,
        },
      ],
    };

    expect(slideshowDetails(lone, urlOf).pictures.map((picture) => picture.blurredFill)).toEqual([
      false,
      true,
    ]);
  });

  it("marks a picture set to always alone, and names the setting as resolved", () => {
    const [first, second] = stored.pictures;
    const edited: StoredSlideshow = {
      ...stored,
      pictures: [first, { ...second, alone: true }] as StoredSlideshow["pictures"],
      portraitPictures: "one-at-a-time",
    };

    const details = slideshowDetails(edited, urlOf);

    expect(details.portraitPictures).toBe("one-at-a-time");
    expect(details.pictures.map((picture) => picture.alone)).toEqual([false, true]);
  });

  it("marks the pictures with an own motion and counts them", () => {
    const motion = {
      from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
      to: { zoom: 2, centerX: 0.5, centerY: 0.5 },
    };
    const [first, second] = stored.pictures;
    const edited = { ...stored, pictures: [first, { ...second, kenBurns: motion }] };

    const details = slideshowDetails(edited as StoredSlideshow, urlOf);

    expect(details.pictures.map((picture) => picture.ownMotion)).toEqual([false, true]);
    expect(details.ownMotionCount).toBe(1);
  });

  it("sums up the whole track with automatic fades as such", () => {
    expect(slideshowDetails(withMusic, urlOf).musicSummary).toEqual({ excerpt: null, fades: null });
  });

  it("sums up an excerpt with the fades it plays, and its length as the music's", () => {
    const trimmed: StoredSlideshow = {
      ...withMusic,
      songs: [{ ...music, trim: { startMs: 2000, endMs: 22_000 } }],
    };

    const details = slideshowDetails(trimmed, urlOf);

    expect(details.musicSummary).toEqual({
      excerpt: { fromSeconds: 2, toSeconds: 22 },
      fades: "in-and-out",
    });
    expect(details.musicSeconds).toBe(20);
    expect(details.durationSeconds).toBe(20);
  });

  it("names the fades once one is the user's own", () => {
    const faded: StoredSlideshow = { ...withMusic, songs: [{ ...music, fadeInMs: 5000 }] };

    expect(slideshowDetails(faded, urlOf).musicSummary).toEqual({ excerpt: null, fades: "in" });
  });

  it("names the music by its file name", () => {
    expect(slideshowDetails(withMusic, urlOf).musicTitle).toBe("Sommer.mp3");
  });

  it("counts several songs and gives the playlist's length, less the crossfade, without a summary", () => {
    const second = { ...music, id: "m2", fileName: "Herbst.mp3" };
    const playlist: StoredSlideshow = { ...withMusic, songs: [music, second] };

    const details = slideshowDetails(playlist, urlOf);

    expect(details.songCount).toBe(2);
    expect(details.musicSeconds).toBe(57);
    expect(details.musicSummary).toBeNull();
  });

  it("tells an order of the user's own, and covers it first with its first picture", () => {
    const reordered: StoredSlideshow = {
      ...stored,
      pictures: [...stored.pictures].reverse(),
      ownOrder: true,
    };

    const details = slideshowDetails(reordered, urlOf);

    expect(details.ownOrder).toBe(true);
    expect(details.coverUrl).toBe("url:p2");
  });

  it("spans the earliest to the latest capture date, whatever the order", () => {
    const reordered: StoredSlideshow = { ...stored, pictures: [...stored.pictures].reverse() };

    const details = slideshowDetails(reordered, urlOf);

    expect([details.capturedFrom, details.capturedTo]).toEqual([
      "2025-07-01T10:00:00Z",
      "2025-07-02T10:00:00Z",
    ]);
  });

  it("tells the slideshow's default transition as stored", () => {
    expect(slideshowDetails({ ...stored, transition: "alternate" }, urlOf).transition).toBe(
      "alternate",
    );
  });

  it("tells the slideshow's colour grade as stored", () => {
    expect(slideshowDetails({ ...stored, look: "warm" }, urlOf).look).toBe("warm");
  });

  it("marks own durations and own transitions, a last picture's transition not counting", () => {
    const timed: StoredSlideshow = {
      ...withMusic,
      pictures: [
        { ...(stored.pictures[0] as StoredPicture), durationMs: 8000, transition: "cut" },
        { ...(stored.pictures[1] as StoredPicture), transition: "dissolve" },
      ],
    };

    const details = slideshowDetails(timed, urlOf);

    expect(details.pictures.map((picture) => picture.ownDurationMs)).toEqual([8000, null]);
    expect(details.pictures.map((picture) => picture.ownTransition)).toEqual(["cut", null]);
    expect([details.ownDurationCount, details.ownTransitionCount]).toEqual([1, 1]);
    expect(details.durationSeconds).toBe(30);
    expect(details.musicSeconds).toBe(30);
  });

  it("spreads the music over the pictures that are left", () => {
    const fewer: StoredSlideshow = { ...withMusic, pictures: stored.pictures.slice(0, 1) };

    expect(slideshowDetails(fewer, urlOf).durationSeconds).toBe(30);
    expect(slideshowDetails(fewer, urlOf).pictures).toHaveLength(1);
  });
});

describe("playingMusic", () => {
  const song = (id: string) => ({ ...music, id, fileName: `${id}.mp3` });

  it.each([
    { songs: [], expected: null },
    { songs: [song("one")], expected: { kind: "song", fileName: "one.mp3" } },
    { songs: [song("one"), song("two"), song("three")], expected: { kind: "songs", count: 3 } },
  ] as const)(
    "names one song by its file, several by their count ($songs.length songs)",
    ({ songs, expected }) => {
      expect(playingMusic({ ...stored, songs })).toEqual(expected);
    },
  );
});
