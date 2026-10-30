import { describe, expect, it } from "vitest";
import type { MusicBeats } from "../../beats";
import type { StoredPicture, StoredSlideshow } from "../../library/stored-slideshow";
import type { BeatsStatus } from "../beats/music-beats-known";
import { firstSongView } from "./testing/first-song-view";

/** 105 BPM: calm's 4-beat step is ~2.286 s, closest to its 7 s target at 3 steps, ~6.857 s. */
const KNOWN_105_BPM: MusicBeats = {
  kind: "beats",
  beatsMs: Array.from({ length: 200 }, (_, beat) => Math.round((beat * 60_000) / 105)),
  beatsPerMinute: 105,
};
const FOUND: BeatsStatus = { kind: "known", beats: KNOWN_105_BPM };

function slideshow(own: Partial<StoredSlideshow> = {}): StoredSlideshow {
  const pictures: StoredPicture[] = ["a", "b", "c", "d"].map((id) => ({
    id,
    capturedAt: "2025-07-01T10:00:00Z",
    width: 1,
    height: 1,
    fileName: `${id}.jpg`,
    colours: { veil: "#404040", accent: "#C0C0C0" },
  }));
  return {
    id: "show",
    title: "Summer",
    createdAt: "2025-07-02T00:00:00Z",
    pictures,
    // A leftover single-settings value from before the mood was chosen (MOOD.md: "the single
    // settings are not touched"), which must not leak into the mood's own explanation text.
    secondsPerPicture: 5,
    mood: "calm",
    songs: [{ id: "m1", fileName: "generated.wav", durationMs: 120_000, mimeType: "audio/wav" }],
    ...own,
  };
}

describe("musicEditorView's picture-times note under a mood (MOOD.md)", () => {
  it("uses the mood's seconds per picture, not the leftover single-settings value", () => {
    const view = firstSongView(slideshow(), FOUND);

    expect(view.note).toMatchObject({
      kind: "own-seconds",
      // calm at 105 BPM: 3 beat-steps of ~2.286 s each, ~6.857 s.
      secondsPerPicture: expect.closeTo(6.857142857142857, 10),
      onTheBeat: true,
    });
  });

  it("shrinks the mood's pace to end with a shorter song instead of outlasting it (ADR-0047)", () => {
    // 4 pictures at calm's ~6.857 s would outlast a 20 s song, but the share stays at or above
    // the floor (2/3 of ~6.857 s, ~4.571 s), so they shrink to it instead of ending in silence.
    const show = slideshow({
      songs: [{ id: "m1", fileName: "generated.wav", durationMs: 20_000, mimeType: "audio/wav" }],
    });

    const view = firstSongView(show, FOUND);

    expect(view.note).toEqual({ kind: "fitted", shareMs: 5000, onTheBeat: true });
  });
});
