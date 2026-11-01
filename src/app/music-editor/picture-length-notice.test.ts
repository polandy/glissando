import { describe, expect, it } from "vitest";
import { pictureLengthNotice, type NoticeInput } from "./picture-length-notice";

const SLIDESHOW_MS = 210_000;
const base: NoticeInput = {
  slideshowMs: SLIDESHOW_MS,
  playlistMs: SLIDESHOW_MS,
  repeatMusic: false,
};
const THIRD_MS = SLIDESHOW_MS / 3;

describe("pictureLengthNotice, when the music ends before the pictures", () => {
  it.each([
    ["well under a third of the slideshow", THIRD_MS - 1, "neutral"],
    ["exactly a third of the slideshow", THIRD_MS, "neutral"],
    ["just above a third of the slideshow", THIRD_MS + 1, "warning"],
    ["nearly all of the slideshow", SLIDESHOW_MS - 1, "warning"],
  ] as const)("is %s: %s ms is %s", (_, overMs, tone) => {
    expect(pictureLengthNotice({ ...base, overMs })).toEqual({
      kind: "music-ends-early",
      overMs,
      tone,
    });
  });
});

describe("pictureLengthNotice, the outcome lines", () => {
  it("names the shrunk share while the pictures are fitted", () => {
    expect(pictureLengthNotice({ ...base, fittedShareMs: 3800 })).toEqual({
      kind: "fitted",
      shareMs: 3800,
    });
  });

  it("says the music repeats while it does, even if the pictures would also fit", () => {
    expect(pictureLengthNotice({ ...base, repeatMusic: true, playlistMs: 60_000 })).toEqual({
      kind: "repeats",
      slideshowMs: SLIDESHOW_MS,
    });
  });

  it("says the music fades out when the slideshow ends before it", () => {
    expect(pictureLengthNotice({ ...base, playlistMs: SLIDESHOW_MS + 1 })).toEqual({
      kind: "fades-out",
      slideshowMs: SLIDESHOW_MS,
    });
  });

  it("says the slideshow ends with the music when both are as long", () => {
    expect(pictureLengthNotice(base)).toEqual({
      kind: "ends-with-music",
      slideshowMs: SLIDESHOW_MS,
    });
  });
});
