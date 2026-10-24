import { describe, expect, it } from "vitest";
import { levelMs, syntheticLoudness } from "../../../compose/energy/testing/synthetic-loudness";
import { NO_SONG_BEATS } from "../../../compose/playlist";
import { NO_SONG_LOUDNESS } from "../../../compose/song-loudness";
import type { StoredPicture, StoredSlideshow } from "../../../library/stored-slideshow";
import { moodEnergyPacing } from "./mood-energy-pacing";

const QUIET_LUFS = -30;
const LOUD_LUFS = -12;

function picture(id: string): StoredPicture {
  return {
    id,
    capturedAt: "2025-07-01T10:00:00Z",
    width: 400,
    height: 300,
    fileName: `${id}.jpg`,
    colours: { veil: "#404040", accent: "#C0C0C0" },
  };
}

function picturesNumbered(count: number): StoredPicture[] {
  return Array.from({ length: count }, (_unused, index) => picture(`p${index}`));
}

function storedSlideshow(overrides: Partial<StoredSlideshow> = {}): StoredSlideshow {
  return {
    id: "s1",
    title: "July 2025",
    createdAt: "2025-07-21T00:00:00Z",
    pictures: picturesNumbered(6),
    songs: [],
    secondsPerPicture: 5,
    ...overrides,
  };
}

describe("moodEnergyPacing", () => {
  it("names the range of the automatic durations, equal without music to pace by", () => {
    const result = moodEnergyPacing(storedSlideshow(), undefined, NO_SONG_BEATS, NO_SONG_LOUDNESS);

    expect(result).toEqual({ minMs: 5000, maxMs: 5000, firstLiftUnitIndex: undefined });
  });

  it("stretches the quiet half and compresses the loud half of a 30 s song", () => {
    const stored = storedSlideshow({
      songs: [{ id: "m", fileName: "m.mp3", durationMs: 30_000, mimeType: "audio/mpeg" }],
    });
    const loudness = new Map([
      ["m", syntheticLoudness([...levelMs(QUIET_LUFS, 15_000), ...levelMs(LOUD_LUFS, 15_000)])],
    ]);

    const result = moodEnergyPacing(stored, undefined, NO_SONG_BEATS, loudness);

    expect(result.maxMs).toBeGreaterThan(result.minMs);
  });

  it("finds the slide unit right after the first lift", () => {
    const stored = storedSlideshow({
      songs: [{ id: "m", fileName: "m.mp3", durationMs: 30_000, mimeType: "audio/mpeg" }],
    });
    const loudness = new Map([
      ["m", syntheticLoudness([...levelMs(QUIET_LUFS, 15_000), ...levelMs(LOUD_LUFS, 15_000)])],
    ]);

    const result = moodEnergyPacing(stored, undefined, NO_SONG_BEATS, loudness);

    expect(result.firstLiftUnitIndex).toBe(2);
  });

  it("gives no lift index while none was found", () => {
    const stored = storedSlideshow({
      songs: [{ id: "m", fileName: "m.mp3", durationMs: 30_000, mimeType: "audio/mpeg" }],
    });
    const loudness = new Map([["m", syntheticLoudness(levelMs(QUIET_LUFS, 30_000))]]);

    const result = moodEnergyPacing(stored, undefined, NO_SONG_BEATS, loudness);

    expect(result.firstLiftUnitIndex).toBeUndefined();
  });

  it("paces to the mood's target instead of the slideshow's own seconds per picture", () => {
    const stored = storedSlideshow({ secondsPerPicture: 9 });

    const result = moodEnergyPacing(stored, "lively", NO_SONG_BEATS, NO_SONG_LOUDNESS);

    expect(result).toEqual({ minMs: 3000, maxMs: 3000, firstLiftUnitIndex: undefined });
  });
});
