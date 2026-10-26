import { describe, expect, it } from "vitest";
import { slideshowDurationMs } from "./slideshow-duration-ms";
import type { StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import type { SongBeats } from "./playlist";

function picture(id: string, capturedAt: string): StoredPicture {
  return {
    id,
    capturedAt,
    fileName: `${id}.jpg`,
    width: 400,
    height: 300,
    colours: { veil: "#404040", accent: "#C0C0C0" },
  };
}

describe("slideshowDurationMs", () => {
  it("sums the slide durations without music", () => {
    const stored: StoredSlideshow = {
      id: "s1",
      title: "July 2025",
      createdAt: "2025-07-21T00:00:00Z",
      pictures: [picture("a", "2025-07-01T10:00:00Z"), picture("b", "2025-07-02T10:00:00Z")],
      songs: [],
      secondsPerPicture: 5,
    };

    expect(slideshowDurationMs(stored)).toBe(10_000);
  });

  it("matches the music length exactly", () => {
    const stored: StoredSlideshow = {
      id: "s1",
      title: "July 2025",
      createdAt: "2025-07-21T00:00:00Z",
      pictures: [
        picture("a", "2025-07-01T10:00:00Z"),
        picture("b", "2025-07-02T10:00:00Z"),
        picture("c", "2025-07-03T10:00:00Z"),
      ],
      songs: [{ id: "m1", fileName: "song.mp3", durationMs: 10_000, mimeType: "audio/mpeg" }],
      secondsPerPicture: 5,
    };

    expect(slideshowDurationMs(stored)).toBe(10_000);
  });

  it("follows the own durations: the automatic pictures share the rest of the music", () => {
    const stored: StoredSlideshow = {
      id: "s1",
      title: "July 2025",
      createdAt: "2025-07-21T00:00:00Z",
      pictures: [
        { ...picture("a", "2025-07-01T10:00:00Z"), durationMs: 15_000 },
        picture("b", "2025-07-02T10:00:00Z"),
      ],
      songs: [{ id: "m1", fileName: "song.mp3", durationMs: 10_000, mimeType: "audio/mpeg" }],
      secondsPerPicture: 5,
    };

    expect(slideshowDurationMs(stored)).toBe(17_000);
  });

  it("fills the music's excerpt, not the whole track", () => {
    const stored: StoredSlideshow = {
      id: "s1",
      title: "July 2025",
      createdAt: "2025-07-21T00:00:00Z",
      pictures: [picture("a", "2025-07-01T10:00:00Z"), picture("b", "2025-07-02T10:00:00Z")],
      songs: [
        {
          id: "m1",
          fileName: "song.mp3",
          durationMs: 60_000,
          mimeType: "audio/mpeg",
          trim: { startMs: 5000, endMs: 15_000 },
        },
      ],
      secondsPerPicture: 5,
    };

    expect(slideshowDurationMs(stored)).toBe(10_000);
  });

  it("counts a composed portrait pair as 1.5 slides, not two (ADR-0028)", () => {
    const portrait = (id: string): StoredPicture => ({
      id,
      capturedAt: "2025-07-01T10:00:00Z",
      fileName: `${id}.jpg`,
      width: 300,
      height: 400,
      colours: { veil: "#404040", accent: "#C0C0C0" },
    });
    const stored: StoredSlideshow = {
      id: "s1",
      title: "July 2025",
      createdAt: "2025-07-21T00:00:00Z",
      pictures: [portrait("a"), portrait("b")],
      songs: [],
      secondsPerPicture: 5,
    };

    expect(slideshowDurationMs(stored)).toBe(7500);
  });

  it("paces a mood's pictures by its target seconds without a tempo found yet (ADR-0045)", () => {
    const stored: StoredSlideshow = {
      id: "s1",
      title: "July 2025",
      createdAt: "2025-07-21T00:00:00Z",
      pictures: [picture("a", "2025-07-01T10:00:00Z"), picture("b", "2025-07-02T10:00:00Z")],
      songs: [],
      secondsPerPicture: 5,
      mood: "calm",
    };

    // The calm target, 7 s, not the stored secondsPerPicture (5 s) composeSlideshow would ignore.
    expect(slideshowDurationMs(stored)).toBe(14_000);
  });

  it("paces a mood's pictures by the tempo found for its music, as composeSlideshow does", () => {
    const stored: StoredSlideshow = {
      id: "s1",
      title: "July 2025",
      createdAt: "2025-07-21T00:00:00Z",
      pictures: [picture("a", "2025-07-01T10:00:00Z"), picture("b", "2025-07-02T10:00:00Z")],
      songs: [{ id: "m1", fileName: "song.mp3", durationMs: 100_000, mimeType: "audio/mpeg" }],
      secondsPerPicture: 5,
      mood: "calm",
    };
    const beats: SongBeats = new Map([
      ["m1", { kind: "beats", beatsMs: [0, 500], beatsPerMinute: 128 }],
    ]);

    // calm at 128 BPM paces to 7.5 s (mood-settings.test.ts), not the no-tempo 7 s.
    expect(slideshowDurationMs(stored, beats)).toBe(15_000);
  });
});
