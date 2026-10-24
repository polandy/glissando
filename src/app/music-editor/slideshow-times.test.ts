import { describe, expect, it } from "vitest";
import { levelMs, syntheticLoudness } from "../../compose/energy/testing/synthetic-loudness";
import type { StoredPicture, StoredSlideshow } from "../../library/stored-slideshow";
import { NO_SONGS_LOUDNESS_KNOWN, slideshowTimes, type SongsLoudnessStatus } from "./slideshow-times";

// Close enough together that the relative gate never excludes the quieter half from the
// excerpt's integrated loudness, so both halves still read on either side of neutral.
const QUIET_LUFS = -24;
const LOUD_LUFS = -16;

function picture(id: string): StoredPicture {
  return {
    id,
    capturedAt: "2025-07-01T10:00:00Z",
    width: 1,
    height: 1,
    fileName: `${id}.jpg`,
    colours: { veil: "#404040", accent: "#C0C0C0" },
  };
}

function slideshow(energyPacing?: true): StoredSlideshow {
  return {
    id: "show",
    title: "Konzert",
    createdAt: "2025-07-02T00:00:00Z",
    pictures: ["p1", "p2", "p3", "p4"].map(picture),
    secondsPerPicture: 5,
    songs: [{ id: "m", fileName: "m.mp3", durationMs: 20_000, mimeType: "audio/mpeg" }],
    ...(energyPacing === undefined ? {} : { energyPacing }),
  };
}

const QUIET_THEN_LOUD: SongsLoudnessStatus = new Map([
  [
    "m",
    { kind: "known", loudness: syntheticLoudness([...levelMs(QUIET_LUFS, 10_000), ...levelMs(LOUD_LUFS, 10_000)]) },
  ],
]);

describe("slideshowTimes", () => {
  it("paces the automatic durations by the music's energy once the slideshow follows it", () => {
    const times = slideshowTimes(slideshow(true), new Map(), QUIET_THEN_LOUD);

    // Picture 1 sits in the quiet half, picture 3 in the loud half: quiet stretches, loud compresses.
    expect(times.durationsMs[0]).toBeGreaterThan(times.durationsMs[2] as number);
    expect(times.durationsMs.reduce((sum, ms) => sum + ms, 0)).toBe(20_000);
  });

  it("keeps the usual even durations when the slideshow does not follow the music's energy", () => {
    const times = slideshowTimes(slideshow(), new Map(), QUIET_THEN_LOUD);

    expect(times.durationsMs).toEqual([5000, 5000, 5000, 5000]);
  });

  it("keeps the usual even durations while the loudness is not known yet, even if following", () => {
    const times = slideshowTimes(slideshow(true), new Map(), NO_SONGS_LOUDNESS_KNOWN);

    expect(times.durationsMs).toEqual([5000, 5000, 5000, 5000]);
  });

  it("defaults to no loudness known when none is given", () => {
    const times = slideshowTimes(slideshow(true), new Map());

    expect(times.durationsMs).toEqual([5000, 5000, 5000, 5000]);
  });
});
