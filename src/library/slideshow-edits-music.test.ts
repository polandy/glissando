import { describe, expect, it } from "vitest";
import { InvalidOwnMusicError } from "./own-music";
import { setMusicFadeIn, setMusicFadeOut, setMusicTrim } from "./slideshow-edits";
import type { StoredMusic, StoredSlideshow } from "./stored-slideshow";

const MUSIC: StoredMusic = {
  id: "m1",
  fileName: "Sommerwind.mp3",
  durationMs: 204_000,
  mimeType: "audio/mpeg",
};

function slideshow(music: StoredMusic | null = MUSIC): StoredSlideshow {
  return {
    id: "show",
    title: "July 2025",
    createdAt: "2025-07-02T00:00:00Z",
    pictures: [
      { id: "a", capturedAt: "2025-07-01T10:00:00Z", width: 1, height: 1, fileName: "a.jpg" },
    ],
    secondsPerPicture: 5,
    ...(music === null ? {} : { music }),
  };
}

describe("setMusicTrim", () => {
  it("stores the excerpt on the music", () => {
    const edited = setMusicTrim(slideshow(), { startMs: 12_000, endMs: 150_000 });

    expect(edited.music).toEqual({ ...MUSIC, trim: { startMs: 12_000, endMs: 150_000 } });
  });

  it("set back to the whole track deletes the field", () => {
    const trimmed = setMusicTrim(slideshow(), { startMs: 12_000, endMs: 150_000 });

    const whole = setMusicTrim(trimmed, { startMs: 0, endMs: MUSIC.durationMs });

    expect(whole.music?.id).toBe("m1");
    expect(whole.music).not.toHaveProperty("trim");
  });

  it("without an excerpt deletes the field", () => {
    const trimmed = setMusicTrim(slideshow(), { startMs: 12_000, endMs: 150_000 });

    expect(setMusicTrim(trimmed, undefined).music).toEqual(MUSIC);
  });

  it("refuses an excerpt shorter than 5 s, so no invalid record is stored", () => {
    expect(() => setMusicTrim(slideshow(), { startMs: 0, endMs: 4000 })).toThrow(
      InvalidOwnMusicError,
    );
  });

  it("refuses a slideshow without music, naming it", () => {
    expect(() => setMusicTrim(slideshow(null), { startMs: 0, endMs: 9000 })).toThrow(
      'slideshow "show" has no music',
    );
  });
});

describe("setMusicFadeIn and setMusicFadeOut", () => {
  it("store their own fade and leave the other automatic", () => {
    const edited = setMusicFadeIn(slideshow(), 5000);

    expect(edited.music?.fadeInMs).toBe(5000);
    expect(edited.music).not.toHaveProperty("fadeOutMs");
  });

  it("store an own fade of 0, which is off, not automatic", () => {
    expect(setMusicFadeOut(slideshow(), 0).music?.fadeOutMs).toBe(0);
  });

  it("without a fade make it automatic again: the field is gone", () => {
    const own = setMusicFadeOut(setMusicFadeIn(slideshow(), 2000), 5000);

    const automatic = setMusicFadeOut(setMusicFadeIn(own, undefined), undefined);

    expect(automatic.music).toEqual(MUSIC);
  });

  it("refuse a fade off the half-second grid", () => {
    expect(() => setMusicFadeIn(slideshow(), 1200)).toThrow("fadeInMs");
    expect(() => setMusicFadeOut(slideshow(), 1200)).toThrow("fadeOutMs");
  });
});
