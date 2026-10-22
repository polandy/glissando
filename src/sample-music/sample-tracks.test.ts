import { describe, expect, it } from "vitest";
import {
  SAMPLE_TRACKS,
  sampleFileName,
  sampleMediaId,
  sampleTrackUrl,
  type SampleTrack,
} from "./sample-tracks.ts";

describe("SAMPLE_TRACKS", () => {
  it("lists all nine tracks, calm to epic, as the assets site's README does", () => {
    expect(SAMPLE_TRACKS.map((track) => track.id)).toEqual([
      "hold-the-frame",
      "through-the-rain-slicked-glass",
      "before-the-world-awakens",
      "seven-floors-above",
      "morning-latitude",
      "top-down-cruising",
      "arrival-at-dawn",
      "where-the-mountains-meet",
      "the-view-from-the-summit",
    ]);
  });

  it("gives the catalogue's size and hash for the first track", () => {
    const track = SAMPLE_TRACKS[0];
    expect(track).toEqual({
      id: "hold-the-frame",
      title: "Hold the Frame",
      durationMs: 175_099,
      bytes: 4_208_494,
      sha256: "4TIPSmj7JOZuSeJUIWA1nZsISEpI7DMQomP1+OAd1kk=",
    });
  });

  it("gives the catalogue's size and hash for the last track", () => {
    const track = SAMPLE_TRACKS[8];
    expect(track).toEqual({
      id: "the-view-from-the-summit",
      title: "The View from the Summit",
      durationMs: 178_312,
      bytes: 4_285_608,
      sha256: "sk3pmI4N54M6oe8o03rCbjAZezkLNVEz7shtwM4LWkM=",
    });
  });
});

describe("sampleMediaId", () => {
  it("prefixes the id, so a sample track's media never collides with a picked file's", () => {
    expect(sampleMediaId("hold-the-frame")).toBe("sample-hold-the-frame");
  });
});

describe("sampleTrackUrl", () => {
  it("joins the base URL, the id and the .mp3 extension", () => {
    expect(sampleTrackUrl("https://example.com/music/", "hold-the-frame")).toBe(
      "https://example.com/music/hold-the-frame.mp3",
    );
  });
});

describe("sampleFileName", () => {
  it("names the file after the title, as a picked MP3 would be named", () => {
    const track: SampleTrack = {
      id: "hold-the-frame",
      title: "Hold the Frame",
      durationMs: 175_099,
      bytes: 4_208_494,
      sha256: "4TIPSmj7JOZuSeJUIWA1nZsISEpI7DMQomP1+OAd1kk=",
    };
    expect(sampleFileName(track)).toBe("Hold the Frame.mp3");
  });
});
