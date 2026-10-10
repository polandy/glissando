import { describe, expect, it } from "vitest";
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
      note: { kind: "noMusic", secondsPerPicture: 5 },
    },
  },
  {
    name: "with music the automatic pictures keep sharing it, each a little shorter",
    show: slideshow({ pictures: pictures(4, "old"), music: MUSIC }),
    added: 2,
    expected: {
      pictures: { before: 4, after: 6 },
      durationSeconds: { before: 60, after: 60 },
      perPictureSeconds: { before: 15, after: 10 },
      note: { kind: "sharesMusic" },
    },
  },
  {
    name: "a picture's own duration stays out of the share",
    show: slideshow({
      pictures: [{ ...picture("own"), durationMs: 20_000 }, ...pictures(2, "old")],
      music: MUSIC,
    }),
    added: 2,
    expected: {
      pictures: { before: 3, after: 5 },
      durationSeconds: { before: 60, after: 60 },
      perPictureSeconds: { before: 20, after: 10 },
      note: { kind: "sharesMusic" },
    },
  },
  {
    name: "below the 2 s floor the slideshow outlasts the music, which is too short",
    show: slideshow({ pictures: pictures(20, "old"), music: { ...MUSIC, durationMs: 50_000 } }),
    added: 10,
    expected: {
      pictures: { before: 20, after: 30 },
      durationSeconds: { before: 50, after: 60 },
      perPictureSeconds: { before: 2.5, after: 2 },
      note: { kind: "musicTooShort", musicSeconds: 50 },
    },
  },
  {
    name: "with every old picture timed by hand there is no share to compare",
    show: slideshow({ pictures: [{ ...picture("own"), durationMs: 10_000 }], music: MUSIC }),
    added: 1,
    expected: {
      pictures: { before: 1, after: 2 },
      durationSeconds: { before: 10, after: 60 },
      perPictureSeconds: null,
      note: { kind: "sharesMusic" },
    },
  },
  {
    name: "own durations alone outlasting the music, with no automatic picture, are not the floor",
    show: slideshow({ pictures: [{ ...picture("own"), durationMs: 70_000 }], music: MUSIC }),
    added: 0,
    expected: {
      pictures: { before: 1, after: 1 },
      durationSeconds: { before: 70, after: 70 },
      perPictureSeconds: null,
      note: { kind: "sharesMusic" },
    },
  },
  {
    name: "a share of exactly 2 s fits the music",
    show: slideshow({ pictures: pictures(20, "old"), music: MUSIC }),
    added: 10,
    expected: {
      pictures: { before: 20, after: 30 },
      durationSeconds: { before: 60, after: 60 },
      perPictureSeconds: { before: 3, after: 2 },
      note: { kind: "sharesMusic" },
    },
  },
];

describe("afterAdding", () => {
  it.each(cases)("$name", ({ show, added, expected }) => {
    expect(afterAdding(show, pictures(added, "new"))).toEqual(expected);
  });
});
