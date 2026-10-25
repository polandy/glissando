import { describe, expect, it } from "vitest";
import { OWN_SECONDS_PICTURE_LENGTH } from "../../library/picture-length";
import type { StoredPicture, StoredSlideshow } from "../../library/stored-slideshow";
import { picture, slideshow } from "../../library/testing/library-store-contract";
import { afterAdding, type AfterAdding } from "./after-adding";

const pictures = (count: number, prefix: string): StoredPicture[] =>
  Array.from({ length: count }, (_, index) => picture(`${prefix}-${index}`));

const MUSIC = { id: "m", fileName: "song.mp3", durationMs: 60_000, mimeType: "audio/mpeg" };

const cases: readonly {
  readonly name: string;
  readonly show: StoredSlideshow;
  readonly added: number;
  readonly expected: AfterAdding;
}[] = [
  {
    name: "without music each new picture adds its seconds and the slideshow gets longer",
    show: slideshow({ pictures: pictures(4, "old"), secondsPerPicture: 5 }),
    added: 2,
    expected: {
      pictures: { before: 4, after: 6 },
      durationSeconds: { before: 20, after: 30 },
      perPictureSeconds: null,
      note: { kind: "ownSeconds", secondsPerPicture: 5 },
      placement: null,
    },
  },
  {
    name: "with music whose pictures last their own seconds each new picture adds them too",
    show: slideshow({
      pictures: pictures(4, "old"),
      songs: [MUSIC],
      secondsPerPicture: 5,
      pictureLength: OWN_SECONDS_PICTURE_LENGTH,
    }),
    added: 2,
    expected: {
      pictures: { before: 4, after: 6 },
      durationSeconds: { before: 20, after: 30 },
      perPictureSeconds: null,
      note: { kind: "ownSeconds", secondsPerPicture: 5 },
      placement: null,
    },
  },
  {
    name: "with music the automatic pictures keep sharing it, each a little shorter",
    show: slideshow({ pictures: pictures(4, "old"), songs: [MUSIC] }),
    added: 2,
    expected: {
      pictures: { before: 4, after: 6 },
      durationSeconds: { before: 60, after: 60 },
      perPictureSeconds: { before: 15, after: 10 },
      note: { kind: "sharesMusic" },
      placement: null,
    },
  },
  {
    name: "a picture's own duration stays out of the share",
    show: slideshow({
      pictures: [{ ...picture("own"), durationMs: 20_000 }, ...pictures(2, "old")],
      songs: [MUSIC],
    }),
    added: 2,
    expected: {
      pictures: { before: 3, after: 5 },
      durationSeconds: { before: 60, after: 60 },
      perPictureSeconds: { before: 20, after: 10 },
      note: { kind: "sharesMusic" },
      placement: null,
    },
  },
  {
    name: "below the 2 s floor the slideshow outlasts the music, which is too short",
    show: slideshow({ pictures: pictures(20, "old"), songs: [{ ...MUSIC, durationMs: 50_000 }] }),
    added: 10,
    expected: {
      pictures: { before: 20, after: 30 },
      durationSeconds: { before: 50, after: 60 },
      perPictureSeconds: { before: 2.5, after: 2 },
      note: { kind: "musicTooShort", musicSeconds: 50 },
      placement: null,
    },
  },
  {
    name: "with every old picture timed by hand there is no share to compare",
    show: slideshow({ pictures: [{ ...picture("own"), durationMs: 10_000 }], songs: [MUSIC] }),
    added: 1,
    expected: {
      pictures: { before: 1, after: 2 },
      durationSeconds: { before: 10, after: 60 },
      perPictureSeconds: null,
      note: { kind: "sharesMusic" },
      placement: null,
    },
  },
  {
    name: "own durations alone outlasting the music, with no automatic picture, are not the floor",
    show: slideshow({ pictures: [{ ...picture("own"), durationMs: 70_000 }], songs: [MUSIC] }),
    added: 0,
    expected: {
      pictures: { before: 1, after: 1 },
      durationSeconds: { before: 70, after: 70 },
      perPictureSeconds: null,
      note: { kind: "sharesMusic" },
      placement: null,
    },
  },
  {
    name: "a share of exactly 2 s fits the music",
    show: slideshow({ pictures: pictures(20, "old"), songs: [MUSIC] }),
    added: 10,
    expected: {
      pictures: { before: 20, after: 30 },
      durationSeconds: { before: 60, after: 60 },
      perPictureSeconds: { before: 3, after: 2 },
      note: { kind: "sharesMusic" },
      placement: null,
    },
  },
  {
    name: "own seconds shrink to fit a shorter music instead of outlasting it (ADR-0047)",
    show: slideshow({
      pictures: pictures(5, "old"),
      songs: [{ ...MUSIC, durationMs: 25_000 }],
      secondsPerPicture: 6,
      pictureLength: OWN_SECONDS_PICTURE_LENGTH,
    }),
    added: 0,
    expected: {
      pictures: { before: 5, after: 5 },
      durationSeconds: { before: 25, after: 25 },
      perPictureSeconds: { before: 5, after: 5 },
      note: { kind: "fitted", shareSeconds: 5 },
      placement: null,
    },
  },
  {
    name: "own seconds too far below the floor keep their length and end in silence, not musicTooShort",
    show: slideshow({
      pictures: pictures(5, "old"),
      songs: [{ ...MUSIC, durationMs: 15_000 }],
      secondsPerPicture: 6,
      pictureLength: OWN_SECONDS_PICTURE_LENGTH,
    }),
    added: 0,
    expected: {
      pictures: { before: 5, after: 5 },
      durationSeconds: { before: 30, after: 30 },
      perPictureSeconds: null,
      note: { kind: "ownSeconds", secondsPerPicture: 6 },
      placement: null,
    },
  },
];

describe("afterAdding", () => {
  it.each(cases)("$name", ({ show, added, expected }) => {
    expect(afterAdding(show, pictures(added, "new"), "byCaptureDate")).toEqual(expected);
  });
});

const portraits = (count: number, prefix: string): StoredPicture[] =>
  pictures(count, prefix).map((each) => ({ ...each, width: 2160, height: 3240 }));

describe("afterAdding with portrait pictures composed into pairs", () => {
  it("counts a pair's duration once, at 1.5 times a single slide", () => {
    const show = slideshow({ pictures: portraits(4, "old"), secondsPerPicture: 5 });

    const after = afterAdding(show, portraits(2, "new"), "byCaptureDate");

    expect(after.pictures).toEqual({ before: 4, after: 6 });
    expect(after.durationSeconds).toEqual({ before: 15, after: 22.5 });
  });

  it("shares the music by weight, a single slide's share being the per-picture seconds", () => {
    const show = slideshow({ pictures: portraits(4, "old"), songs: [MUSIC] });

    const after = afterAdding(show, portraits(2, "new"), "byCaptureDate");

    expect(after.durationSeconds).toEqual({ before: 60, after: 60 });
    expect(after.perPictureSeconds).toEqual({ before: 20, after: 60 / 4.5 });
    expect(after.note).toEqual({ kind: "sharesMusic" });
  });

  it("finds the floor by the single slide's weighted share, not the picture count", () => {
    // 20 pairs share 60 s by weight 30: 2 s a single slide, 3 s a pair, so it fits the music.
    const show = slideshow({ pictures: portraits(40, "old"), songs: [MUSIC] });

    expect(afterAdding(show, [], "byCaptureDate").note).toEqual({ kind: "sharesMusic" });
  });
});

describe("afterAdding, where the new pictures go in an own order", () => {
  const at = (id: string, capturedAt: string): StoredPicture => ({ ...picture(id), capturedAt });
  const own = slideshow({
    ownOrder: true,
    pictures: [
      at("sunset", "2025-07-08T19:40:00Z"),
      at("arrival", "2025-07-02T10:00:00Z"),
      at("lake", "2025-07-03T10:00:00Z"),
    ],
  });
  const eve = at("eve", "2025-07-01T18:00:00Z");
  const added = [eve, at("evening", "2025-07-08T21:00:00Z"), at("ferry", "2025-07-03T12:00:00Z")];

  it("shows the play order with the new pictures sorted in, and after which picture they go", () => {
    expect(afterAdding(own, added, "byCaptureDate").placement).toEqual({
      order: [
        { id: "sunset", isNew: false },
        { id: "evening", isNew: true },
        { id: "eve", isNew: true },
        { id: "arrival", isNew: false },
        { id: "lake", isNew: false },
        { id: "ferry", isNew: true },
      ],
      spots: [
        { afterNumber: 1, count: 2 },
        { afterNumber: 3, count: 1 },
      ],
    });
  });

  it("shows them all after the last picture when they go at the end", () => {
    expect(afterAdding(own, added, "atEnd").placement?.spots).toEqual([
      { afterNumber: 3, count: 3 },
    ]);
  });

  it("names the start as after picture 0 for pictures going before the first", () => {
    const later = slideshow({ ownOrder: true, pictures: [at("arrival", "2025-07-02T10:00:00Z")] });

    expect(afterAdding(later, [eve], "byCaptureDate").placement?.spots).toEqual([
      { afterNumber: 0, count: 1 },
    ]);
  });

  it("has no placement to show for a slideshow sorted by capture date", () => {
    const sorted = slideshow({ pictures: own.pictures });

    expect(afterAdding(sorted, added, "byCaptureDate").placement).toBeNull();
  });
});
