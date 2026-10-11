import { describe, expect, it } from "vitest";
import { excerptBeatsMs } from "./excerpt-beats";
import { NO_BEATS, type MusicBeats } from "../beats";
import type { StoredMusic } from "../library/stored-slideshow";

const MUSIC: StoredMusic = {
  id: "m1",
  fileName: "Sommerwind.mp3",
  durationMs: 20_000,
  mimeType: "audio/mpeg",
};
const BEATS: MusicBeats = {
  kind: "beats",
  beatsMs: [0, 4000, 8000, 12_000, 16_000],
  beatsPerMinute: 15,
};

describe("excerptBeatsMs", () => {
  it("gives the beats inside the whole track, its start and end excluded", () => {
    expect(excerptBeatsMs(MUSIC, BEATS)).toEqual([4000, 8000, 12_000, 16_000]);
  });

  it("measures the beats from the trimmed excerpt's start and drops those outside it", () => {
    const trimmed = { ...MUSIC, trim: { startMs: 3000, endMs: 12_000 } };

    expect(excerptBeatsMs(trimmed, BEATS)).toEqual([1000, 5000]);
  });

  it("has no beats to snap to without music, without a clear beat, or for even picture changes", () => {
    expect(excerptBeatsMs(undefined, BEATS)).toBeUndefined();
    expect(excerptBeatsMs(MUSIC, NO_BEATS)).toBeUndefined();
    expect(excerptBeatsMs({ ...MUSIC, pictureChanges: "even" }, BEATS)).toBeUndefined();
  });
});
