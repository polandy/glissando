import { describe, expect, it } from "vitest";
import type { PictureFocus } from "../../../library/picture-focus";
import type { StoredCard, StoredPicture, StoredSlideshow } from "../../../library/stored-slideshow";
import { isGroundSlide } from "../../../player";
import { levelMs, syntheticLoudness } from "../../../compose/energy/testing/synthetic-loudness";
import { NO_SONG_BEATS } from "../../../compose/playlist";
import { NO_SONG_LOUDNESS } from "../../../compose/song-loudness";
import { MOOD_PROFILES } from "../../../compose/mood-settings";
import type { Slideshow } from "../../../player";
import {
  moodPreviewSlideshow,
  mutedPreviewSlideshow,
  PREVIEW_PICTURE_COUNT,
  previewWindowStartIndex,
} from "./mood-preview-slideshow";

function picture(id: string, overrides: Partial<StoredPicture> = {}): StoredPicture {
  return {
    id,
    capturedAt: "2025-07-01T10:00:00Z",
    fileName: `${id}.jpg`,
    width: 400,
    height: 300,
    colours: { veil: "#404040", accent: "#C0C0C0" },
    ...overrides,
  };
}

const sources = {
  picture: (id: string) => `pictures/${id}.jpg`,
  music: (id: string) => `music/${id}.mp3`,
  video: (id: string) => `videos/${id}.mp4`,
};

const NO_FOCUS: ReadonlyMap<string, PictureFocus> = new Map();

const CARD: StoredCard = {
  title: "Summer at the Lake",
  style: "modern",
  position: "centre",
  entrance: "rise",
  background: { kind: "colour", colour: "plum" },
  motion: true,
};

function picturesNumbered(count: number): StoredPicture[] {
  return Array.from({ length: count }, (_unused, index) =>
    picture(`p${index}`, { capturedAt: `2025-07-01T10:${String(index).padStart(2, "0")}:00Z` }),
  );
}

function storedSlideshow(overrides: Partial<StoredSlideshow> = {}): StoredSlideshow {
  return {
    id: "s1",
    title: "July 2025",
    createdAt: "2025-07-21T00:00:00Z",
    pictures: picturesNumbered(2),
    songs: [],
    secondsPerPicture: 5,
    ...overrides,
  };
}

const QUIET_LUFS = -30;
const LOUD_LUFS = -12;

function preview(stored: StoredSlideshow, shownMood: Parameters<typeof moodPreviewSlideshow>[1]) {
  return moodPreviewSlideshow(
    stored,
    shownMood,
    sources,
    NO_FOCUS,
    NO_SONG_BEATS,
    NO_SONG_LOUDNESS,
    "en",
  );
}

describe("moodPreviewSlideshow", () => {
  it("composes only the first PREVIEW_PICTURE_COUNT pictures", () => {
    const stored = storedSlideshow({ pictures: picturesNumbered(PREVIEW_PICTURE_COUNT + 2) });

    const slides = preview(stored, undefined).slides;

    expect(slides).toHaveLength(PREVIEW_PICTURE_COUNT);
  });

  it("drops the opening and closing card from the preview", () => {
    const stored = storedSlideshow({
      openingCard: CARD,
      closingCard: { ...CARD, title: "The End" },
    });

    const slides = preview(stored, undefined).slides;

    expect(slides).toHaveLength(2);
    for (const slide of slides) {
      expect(isGroundSlide(slide)).toBe(false);
      expect("card" in slide ? slide.card : undefined).toBeUndefined();
    }
  });

  it("shows the candidate mood passed in, not the slideshow's stored mood", () => {
    const stored = storedSlideshow({ mood: "calm" });

    const slides = preview(stored, "lively").slides;

    // Lively's target seconds (3 s) without a tempo, not calm's (7 s).
    expect(slides[0]?.durationMs).toBe(MOOD_PROFILES.lively.targetSeconds * 1000);
  });

  it("falls back to the slideshow's own picture length when the candidate mood is Custom", () => {
    const stored = storedSlideshow({ mood: "calm", secondsPerPicture: 4 });

    const slides = preview(stored, undefined).slides;

    expect(slides[0]?.durationMs).toBe(4000);
  });

  it("does not mutate the stored slideshow passed in", () => {
    const stored = storedSlideshow({
      pictures: picturesNumbered(PREVIEW_PICTURE_COUNT + 2),
      openingCard: CARD,
      mood: "calm",
    });
    const picturesBefore = stored.pictures;

    preview(stored, "lively");

    expect(stored.pictures).toBe(picturesBefore);
    expect(stored.pictures).toHaveLength(PREVIEW_PICTURE_COUNT + 2);
    expect(stored.openingCard).toBe(CARD);
    expect(stored.mood).toBe("calm");
  });

  it("plays the four slide units around the first lift, with energy pacing on", () => {
    const stored = storedSlideshow({
      pictures: picturesNumbered(8),
      songs: [{ id: "m", fileName: "m.mp3", durationMs: 30_000, mimeType: "audio/mpeg" }],
      energyPacing: true,
    });
    const loudness = new Map([
      ["m", syntheticLoudness([...levelMs(QUIET_LUFS, 15_000), ...levelMs(LOUD_LUFS, 15_000)])],
    ]);

    const slides = moodPreviewSlideshow(
      stored,
      undefined,
      sources,
      NO_FOCUS,
      NO_SONG_BEATS,
      loudness,
      "en",
    ).slides;

    expect(slides).toHaveLength(PREVIEW_PICTURE_COUNT);
    expect(slides).not.toEqual(preview(stored, undefined).slides);
  });

  it("plays the first four slide units, with energy pacing off", () => {
    const stored = storedSlideshow({
      pictures: picturesNumbered(8),
      songs: [{ id: "m", fileName: "m.mp3", durationMs: 30_000, mimeType: "audio/mpeg" }],
    });
    const loudness = new Map([
      ["m", syntheticLoudness([...levelMs(QUIET_LUFS, 15_000), ...levelMs(LOUD_LUFS, 15_000)])],
    ]);

    const slides = moodPreviewSlideshow(
      stored,
      undefined,
      sources,
      NO_FOCUS,
      NO_SONG_BEATS,
      loudness,
      "en",
    ).slides;

    expect(slides.map((slide) => ("image" in slide ? slide.image.src : undefined))).toEqual([
      "pictures/p0.jpg",
      "pictures/p1.jpg",
      "pictures/p2.jpg",
      "pictures/p3.jpg",
    ]);
  });
});

describe("previewWindowStartIndex", () => {
  it("starts at the first picture without a lift", () => {
    expect(previewWindowStartIndex(10, undefined)).toBe(0);
  });

  it("starts two pictures before the lift", () => {
    expect(previewWindowStartIndex(10, 5)).toBe(3);
  });

  it("never starts before the first picture", () => {
    expect(previewWindowStartIndex(10, 1)).toBe(0);
  });

  it("never runs the window past the last picture", () => {
    expect(previewWindowStartIndex(10, 9)).toBe(6);
  });

  it("starts at the first picture once there are fewer than the window needs", () => {
    expect(previewWindowStartIndex(3, 2)).toBe(0);
  });
});

function trackWithGain(gain: number) {
  return { src: "song.mp3", atMs: 0, startMs: 0, endMs: 1000, fadeInMs: 0, fadeOutMs: 0, gain };
}

describe("mutedPreviewSlideshow", () => {
  it("zeroes every music track's gain, leaving the rest of the track untouched", () => {
    const stored = storedSlideshow({
      songs: [{ id: "s1", fileName: "song.mp3", durationMs: 1000, mimeType: "audio/mpeg" }],
    });
    const slideshow: Slideshow = {
      ...preview(stored, undefined),
      music: [trackWithGain(0.8), trackWithGain(0.5)],
    };

    const muted = mutedPreviewSlideshow(slideshow);

    expect(muted.music?.map((track) => track.gain)).toEqual([0, 0]);
    expect(muted.music?.map((track) => track.src)).toEqual(["song.mp3", "song.mp3"]);
  });

  it("leaves a slideshow without music as it was", () => {
    const stored = storedSlideshow();
    const slideshow = preview(stored, undefined);

    const muted = mutedPreviewSlideshow(slideshow);

    expect(muted.music).toBeUndefined();
  });

  it("does not mutate the slideshow passed in", () => {
    const stored = storedSlideshow({
      songs: [{ id: "s1", fileName: "song.mp3", durationMs: 1000, mimeType: "audio/mpeg" }],
    });
    const slideshow: Slideshow = { ...preview(stored, undefined), music: [trackWithGain(0.8)] };
    const tracksBefore = slideshow.music;

    mutedPreviewSlideshow(slideshow);

    expect(slideshow.music).toBe(tracksBefore);
    expect(slideshow.music?.[0]?.gain).toBe(0.8);
  });
});
