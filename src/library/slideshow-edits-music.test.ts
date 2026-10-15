import { describe, expect, it } from "vitest";
import { EVEN_PICTURE_CHANGES, InvalidOwnMusicError } from "./own-music";
import {
  setMusicFadeIn,
  setMusicFadeOut,
  setMusicPictureChanges,
  setMusicTrim,
} from "./slideshow-edits-music";
import type { StoredMusic, StoredSlideshow } from "./stored-slideshow";

const MUSIC: StoredMusic = {
  id: "m1",
  fileName: "Sommerwind.mp3",
  durationMs: 204_000,
  mimeType: "audio/mpeg",
};

function slideshow(...songs: readonly StoredMusic[]): StoredSlideshow {
  return {
    id: "show",
    title: "July 2025",
    createdAt: "2025-07-02T00:00:00Z",
    pictures: [
      {
        id: "a",
        capturedAt: "2025-07-01T10:00:00Z",
        width: 1,
        height: 1,
        fileName: "a.jpg",
        colours: { veil: "#404040", accent: "#C0C0C0" },
      },
    ],
    songs: songs.length === 0 ? [MUSIC] : songs,
    secondsPerPicture: 5,
  };
}

describe("setMusicTrim", () => {
  it("stores the excerpt on the music", () => {
    const edited = setMusicTrim(slideshow(), "m1", { startMs: 12_000, endMs: 150_000 });

    expect(edited.songs[0]).toEqual({ ...MUSIC, trim: { startMs: 12_000, endMs: 150_000 } });
  });

  it("set back to the whole track deletes the field", () => {
    const trimmed = setMusicTrim(slideshow(), "m1", { startMs: 12_000, endMs: 150_000 });

    const whole = setMusicTrim(trimmed, "m1", { startMs: 0, endMs: MUSIC.durationMs });

    expect(whole.songs[0]?.id).toBe("m1");
    expect(whole.songs[0]).not.toHaveProperty("trim");
  });

  it("without an excerpt deletes the field", () => {
    const trimmed = setMusicTrim(slideshow(), "m1", { startMs: 12_000, endMs: 150_000 });

    expect(setMusicTrim(trimmed, "m1", undefined).songs[0]).toEqual(MUSIC);
  });

  it("refuses an excerpt shorter than 5 s, so no invalid record is stored", () => {
    expect(() => setMusicTrim(slideshow(), "m1", { startMs: 0, endMs: 4000 })).toThrow(
      InvalidOwnMusicError,
    );
  });

  it("refuses a song the slideshow does not play, naming both", () => {
    expect(() => setMusicTrim(slideshow(), "gone", { startMs: 0, endMs: 9000 })).toThrow(
      'slideshow "show" has no song "gone"',
    );
  });
});

describe("editing a song of several", () => {
  it("changes only the song addressed, in its place", () => {
    const other: StoredMusic = { ...MUSIC, id: "m2", fileName: "Herbst.mp3" };

    const edited = setMusicFadeOut(slideshow(MUSIC, other), "m2", 5000);

    expect(edited.songs).toEqual([MUSIC, { ...other, fadeOutMs: 5000 }]);
  });
});

describe("setMusicFadeIn and setMusicFadeOut", () => {
  it("store their own fade and leave the other automatic", () => {
    const edited = setMusicFadeIn(slideshow(), "m1", 5000);

    expect(edited.songs[0]?.fadeInMs).toBe(5000);
    expect(edited.songs[0]).not.toHaveProperty("fadeOutMs");
  });

  it("store an own fade of 0, which is off, not automatic", () => {
    expect(setMusicFadeOut(slideshow(), "m1", 0).songs[0]?.fadeOutMs).toBe(0);
  });

  it("without a fade make it automatic again: the field is gone", () => {
    const own = setMusicFadeOut(setMusicFadeIn(slideshow(), "m1", 2000), "m1", 5000);

    const automatic = setMusicFadeOut(setMusicFadeIn(own, "m1", undefined), "m1", undefined);

    expect(automatic.songs[0]).toEqual(MUSIC);
  });

  it("refuse a fade off the half-second grid", () => {
    expect(() => setMusicFadeIn(slideshow(), "m1", 1200)).toThrow("fadeInMs");
    expect(() => setMusicFadeOut(slideshow(), "m1", 1200)).toThrow("fadeOutMs");
  });
});

describe("setMusicPictureChanges", () => {
  it("stores even picture changes, which ignore the beats", () => {
    expect(
      setMusicPictureChanges(slideshow(), "m1", EVEN_PICTURE_CHANGES).songs[0]?.pictureChanges,
    ).toBe("even");
  });

  it("on the beat makes them automatic again: the field is gone", () => {
    const even = setMusicPictureChanges(slideshow(), "m1", EVEN_PICTURE_CHANGES);

    expect(setMusicPictureChanges(even, "m1", undefined).songs[0]).toEqual(MUSIC);
  });

  it("refuses a value that is not a choice, naming the field", () => {
    const unknownChoice = "sometimes" as typeof EVEN_PICTURE_CHANGES;

    expect(() => setMusicPictureChanges(slideshow(), "m1", unknownChoice)).toThrow(
      InvalidOwnMusicError,
    );
    expect(() => setMusicPictureChanges(slideshow(), "m1", unknownChoice)).toThrow(
      "pictureChanges",
    );
  });
});
