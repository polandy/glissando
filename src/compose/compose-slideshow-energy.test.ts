import { describe, expect, it } from "vitest";
import type { PictureFocus } from "../library/picture-focus";
import { OWN_SECONDS_PICTURE_LENGTH } from "../library/picture-length";
import type { StoredMusic, StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import { composeSlideshow } from "./compose-slideshow";
import { levelMs, syntheticLoudness } from "./energy/testing/synthetic-loudness";
import { NO_SONG_BEATS } from "./playlist";
import { NO_SONG_LOUDNESS, type SongLoudness } from "./song-loudness";

// Close enough together that the relative gate never excludes the quieter passage from the
// excerpt's integrated loudness (dev-docs/app/slideshow-editing/ENERGY_PACING.md).
const QUIET_LUFS = -24;
const LOUD_LUFS = -16;

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

/** `count` automatic pictures, each a distinct id so a slideshow can hold several. */
function pictures(count: number): StoredPicture[] {
  return Array.from({ length: count }, (_, index) => picture(`p${index}`));
}

const sources = {
  picture: (id: string) => `pictures/${id}.jpg`,
  music: (id: string) => `music/${id}.mp3`,
  video: (id: string) => `videos/${id}.mp4`,
};

const NO_FOCUS: ReadonlyMap<string, PictureFocus> = new Map();

function song(id: string, durationMs: number, own: Partial<StoredMusic> = {}): StoredMusic {
  return { id, fileName: `${id}.mp3`, durationMs, mimeType: "audio/mpeg", ...own };
}

function loudnessOf(id: string, lufsLevels: readonly number[]): SongLoudness {
  return new Map([[id, syntheticLoudness(lufsLevels)]]);
}

function storedSlideshow(overrides: Partial<StoredSlideshow> = {}): StoredSlideshow {
  return {
    id: "s1",
    title: "July 2025",
    createdAt: "2025-07-21T00:00:00Z",
    pictures: pictures(2),
    songs: [],
    secondsPerPicture: 5,
    ...overrides,
  };
}

function composed(stored: StoredSlideshow, loudness: SongLoudness = NO_SONG_LOUDNESS) {
  return composeSlideshow(stored, sources, NO_FOCUS, NO_SONG_BEATS, loudness, "en");
}

function durationsOf(stored: StoredSlideshow, loudness?: SongLoudness): number[] {
  return composed(stored, loudness).slides.map((slide) => slide.durationMs);
}

/** The ms each slide ends at, running cumulatively from the first. */
function slideEndsMs(durationsMs: readonly number[]): number[] {
  let sum = 0;
  return durationsMs.map((durationMs) => (sum += durationMs));
}

describe("composeSlideshow with energy pacing", () => {
  it("paces pictures by secondsPerPicture, unaffected by the music, while the switch is off", () => {
    const a = song("a", 10_000);
    const stored = storedSlideshow({
      pictures: pictures(2),
      songs: [a],
      pictureLength: OWN_SECONDS_PICTURE_LENGTH,
    });
    const loudness = loudnessOf("a", [...levelMs(QUIET_LUFS, 5000), ...levelMs(LOUD_LUFS, 5000)]);

    expect(durationsOf(stored, loudness)).toEqual([5000, 5000]);
  });

  it("stretches the slides over the quiet half and compresses the ones over the loud half", () => {
    // Four slides so the first and last stay clear of the lift near the midpoint, cut later
    // (see the "cuts a slide boundary" case below), and show the pacing alone.
    const a = song("a", 20_000);
    const stored = storedSlideshow({
      pictures: pictures(4),
      songs: [a],
      pictureLength: OWN_SECONDS_PICTURE_LENGTH,
      energyPacing: true,
    });
    const loudness = loudnessOf("a", [...levelMs(QUIET_LUFS, 10_000), ...levelMs(LOUD_LUFS, 10_000)]);

    const durationsMs = durationsOf(stored, loudness);

    expect(durationsMs[0] as number).toBeGreaterThan(durationsMs[3] as number);
    expect(durationsMs.reduce((sum, ms) => sum + ms, 0)).toBe(20_000);
  });

  it("still ends with the music while filling it, with energy pacing on", () => {
    const a = song("a", 10_000);
    const stored = storedSlideshow({ pictures: pictures(2), songs: [a], energyPacing: true });
    const loudness = loudnessOf("a", [...levelMs(QUIET_LUFS, 5000), ...levelMs(LOUD_LUFS, 5000)]);

    const durationsMs = durationsOf(stored, loudness);

    expect(durationsMs.reduce((sum, ms) => sum + ms, 0)).toBe(10_000);
  });

  it("keeps a picture's own duration unchanged and out of the re-pacing", () => {
    const a = song("a", 10_000);
    const stored = storedSlideshow({
      pictures: [picture("own", { durationMs: 2000 }), ...pictures(2)],
      songs: [a],
      pictureLength: OWN_SECONDS_PICTURE_LENGTH,
      energyPacing: true,
    });
    const loudness = loudnessOf("a", [...levelMs(QUIET_LUFS, 5000), ...levelMs(LOUD_LUFS, 5000)]);

    const durationsMs = durationsOf(stored, loudness);

    expect(durationsMs[0]).toBe(2000);
  });

  it("cuts a slide boundary exactly onto a lift", () => {
    const a = song("a", 30_000);
    const stored = storedSlideshow({
      pictures: pictures(6),
      songs: [a],
      pictureLength: OWN_SECONDS_PICTURE_LENGTH,
      energyPacing: true,
    });
    const loudness = loudnessOf("a", [...levelMs(QUIET_LUFS, 15_000), ...levelMs(LOUD_LUFS, 15_000)]);

    const durationsMs = durationsOf(stored, loudness);

    // The quiet-to-loud rise sits at 15 000 ms (dev-docs ENERGY_PACING.md "Lifts"); a boundary
    // between two automatic slides lands there exactly.
    expect(slideEndsMs(durationsMs)).toContain(15_000);
  });

  it("drops the transition at a lift, but keeps a picture's own transition there", () => {
    const a = song("a", 30_000);
    const base = storedSlideshow({
      pictures: pictures(6),
      songs: [a],
      pictureLength: OWN_SECONDS_PICTURE_LENGTH,
      energyPacing: true,
    });
    const loudness = loudnessOf("a", [...levelMs(QUIET_LUFS, 15_000), ...levelMs(LOUD_LUFS, 15_000)]);

    const cutSlides = composed(base, loudness).slides;
    const cutIndex = slideEndsMs(cutSlides.map((slide) => slide.durationMs)).indexOf(15_000);
    expect(cutSlides[cutIndex]?.transitionToNext).toBeUndefined();

    // The same picture, now with its own transition, keeps it even though its end still falls
    // exactly on the lift.
    const withOwn: StoredSlideshow = {
      ...base,
      pictures: base.pictures.map((p, index) =>
        index === cutIndex ? { ...p, transition: "dissolve" } : p,
      ),
    };
    const ownSlides = composed(withOwn, loudness).slides;
    expect(ownSlides[cutIndex]?.transitionToNext?.effect).toBe("dissolve");
  });
});
