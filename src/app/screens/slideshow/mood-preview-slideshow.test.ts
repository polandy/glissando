import { describe, expect, it } from "vitest";
import type { PictureFocus } from "../../../library/picture-focus";
import type { StoredCard, StoredPicture, StoredSlideshow } from "../../../library/stored-slideshow";
import { isGroundSlide } from "../../../player";
import { NO_SONG_BEATS } from "../../../compose/playlist";
import { NO_SONG_LOUDNESS } from "../../../compose/song-loudness";
import { MOOD_PROFILES } from "../../../compose/mood-settings";
import type { Slideshow } from "../../../player";
import {
  moodPreviewSlideshow,
  mutedPreviewSlideshow,
  PREVIEW_PICTURE_COUNT,
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
