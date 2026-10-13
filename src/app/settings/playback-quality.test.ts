import { describe, expect, it } from "vitest";
import { createMemoryStorage } from "../testing/memory-storage";
import {
  createStoragePlaybackQualityStore,
  effectivePlaybackQuality,
  screenShortEdge,
  type PlaybackQuality,
  type PlaybackQualityPreference,
} from "./playback-quality";

describe("screenShortEdge", () => {
  it.each([
    { name: "a Pixel 9 Pro upright", width: 412, height: 915, ratio: 3.107, edge: 1280 },
    { name: "a laptop", width: 1440, height: 900, ratio: 2, edge: 1800 },
    { name: "a 4K TV browser", width: 1920, height: 1080, ratio: 2, edge: 2160 },
    { name: "a Full HD monitor", width: 1920, height: 1080, ratio: 1, edge: 1080 },
  ])("is the short edge times the pixel ratio on $name", ({ width, height, ratio, edge }) => {
    expect(screenShortEdge({ width, height, devicePixelRatio: ratio })).toBe(edge);
  });
});

describe("effectivePlaybackQuality", () => {
  it.each<[PlaybackQualityPreference, number, PlaybackQuality]>([
    ["auto", 1280, "1440"],
    ["auto", 1440, "1440"],
    ["auto", 1441, "4k"],
    ["auto", 2160, "4k"],
    ["1440", 2160, "1440"],
    ["4k", 1280, "4k"],
  ])("plays %s on a screen with a %i-pixel short edge in %s", (preference, edge, quality) => {
    expect(effectivePlaybackQuality(preference, edge)).toBe(quality);
  });
});

describe("the stored playback quality", () => {
  it("is automatic on a device that never chose one", () => {
    expect(createStoragePlaybackQualityStore(createMemoryStorage()).read()).toBe("auto");
  });

  it("keeps the choice on this device", () => {
    const storage = createMemoryStorage();
    createStoragePlaybackQualityStore(storage).write("4k");

    expect(createStoragePlaybackQualityStore(storage).read()).toBe("4k");
  });
});
