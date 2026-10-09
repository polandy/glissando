import { describe, expect, it } from "vitest";
import {
  audibleEndMs,
  automaticFadeInMs,
  automaticFadeOutMs,
  musicExcerpt,
  musicExcerptMs,
  resolveMusicTiming,
} from "./music-excerpt";
import type { StoredMusic } from "../library/stored-slideshow";

const TRACK_MS = 204_000;
const WHOLE: StoredMusic = {
  id: "m1",
  fileName: "a.mp3",
  durationMs: TRACK_MS,
  mimeType: "audio/mpeg",
};

function trimmed(startMs: number, endMs: number, own: Partial<StoredMusic> = {}): StoredMusic {
  return { ...WHOLE, trim: { startMs, endMs }, ...own };
}

describe("musicExcerpt", () => {
  it("is the whole track without a trim", () => {
    expect(musicExcerpt(WHOLE)).toEqual({ startMs: 0, endMs: TRACK_MS });
    expect(musicExcerptMs(WHOLE)).toBe(TRACK_MS);
  });

  it("is the trim when there is one", () => {
    expect(musicExcerptMs(trimmed(12_000, 150_000))).toBe(138_000);
  });

  it("is absent without music", () => {
    expect(musicExcerptMs(undefined)).toBeUndefined();
  });
});

describe("audibleEndMs", () => {
  it.each([
    ["the slideshow fills the excerpt: the excerpt end", 138_000, 150_000],
    ["the slideshow is longer: the excerpt end", 200_000, 150_000],
    ["the slideshow is shorter: where it ends in the track", 100_000, 112_000],
  ])("is %s", (_, slideshowMs, expected) => {
    expect(audibleEndMs(trimmed(12_000, 150_000), slideshowMs)).toBe(expected);
  });
});

describe("automatic fades", () => {
  it.each([
    ["short when the excerpt starts mid-track", trimmed(12_000, 150_000), 2000],
    ["off when the track plays from its start", trimmed(0, 150_000), 0],
  ])("fade in %s", (_, music, expected) => {
    expect(automaticFadeInMs(music)).toBe(expected);
  });

  it.each([
    ["off when the track ends by itself", WHOLE, TRACK_MS, 0],
    ["short when the excerpt stops before the track's end", trimmed(0, 150_000), 150_000, 2000],
    ["short when the slideshow ends before the track", WHOLE, 120_000, 2000],
  ])("fade out %s", (_, music, slideshowMs, expected) => {
    expect(automaticFadeOutMs(music, slideshowMs)).toBe(expected);
  });
});

describe("resolveMusicTiming", () => {
  it("plays the whole track without fades when nothing is trimmed and the slideshow fills it", () => {
    expect(resolveMusicTiming(WHOLE, TRACK_MS)).toEqual({
      startMs: 0,
      endMs: TRACK_MS,
      fadeInMs: 0,
      fadeOutMs: 0,
    });
  });

  it("fades automatically where the excerpt cuts the track", () => {
    expect(resolveMusicTiming(trimmed(12_000, 150_000), 138_000)).toEqual({
      startMs: 12_000,
      endMs: 150_000,
      fadeInMs: 2000,
      fadeOutMs: 2000,
    });
  });

  it("keeps own fades, 0 included, over the automatic ones", () => {
    const music = trimmed(12_000, 150_000, { fadeInMs: 0, fadeOutMs: 5000 });

    expect(resolveMusicTiming(music, 138_000)).toMatchObject({ fadeInMs: 0, fadeOutMs: 5000 });
  });

  it("ends with a shorter slideshow, fading out there", () => {
    expect(resolveMusicTiming(WHOLE, 60_000)).toEqual({
      startMs: 0,
      endMs: 60_000,
      fadeInMs: 0,
      fadeOutMs: 2000,
    });
  });

  it("ends at the excerpt end when the slideshow is longer", () => {
    expect(resolveMusicTiming(trimmed(0, 150_000), 170_000).endMs).toBe(150_000);
  });

  it("scales both fades down in proportion when together they outlast what is heard", () => {
    const music = trimmed(10_000, 20_000, { fadeInMs: 10_000, fadeOutMs: 5000 });

    expect(resolveMusicTiming(music, 6000)).toMatchObject({ fadeInMs: 4000, fadeOutMs: 2000 });
  });
});
