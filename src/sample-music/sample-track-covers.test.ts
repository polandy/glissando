import { describe, expect, it } from "vitest";
import { SAMPLE_TRACKS } from "./sample-tracks.ts";
import { SAMPLE_TRACK_COVER_URLS } from "./sample-track-covers.ts";

describe("SAMPLE_TRACK_COVER_URLS", () => {
  it("bundles a cover for every track in the catalogue", () => {
    for (const track of SAMPLE_TRACKS) {
      expect(SAMPLE_TRACK_COVER_URLS[track.id]).toBeTruthy();
    }
  });

  it("gives each cover its own URL", () => {
    const urls = SAMPLE_TRACKS.map((track) => SAMPLE_TRACK_COVER_URLS[track.id]);
    expect(new Set(urls).size).toBe(SAMPLE_TRACKS.length);
  });
});
