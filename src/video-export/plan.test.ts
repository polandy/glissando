import { describe, expect, it } from "vitest";
import {
  audioSegments,
  estimatedBytes,
  exportFileName,
  frameCount,
  frameDurationUs,
  frameTimeSeconds,
  frameTimestampUs,
  isKeyFrame,
  packetCountBounds,
  presetById,
  VIDEO_PRESETS,
} from "./plan";

describe("video export presets", () => {
  it("offers 720p, 1080p and 4K with the spec's sizes, codecs and bitrates", () => {
    expect(
      VIDEO_PRESETS.map(({ id, size, codec, bitrate }) => [
        id,
        size.width,
        size.height,
        codec,
        bitrate,
      ]),
    ).toEqual([
      ["720p", 1280, 720, "avc1.640028", 4_000_000],
      ["1080p", 1920, 1080, "avc1.640028", 8_000_000],
      ["4k", 3840, 2160, "avc1.640033", 24_000_000],
    ]);
  });

  it("names the file after the preset: 720p, 1080p, 4K", () => {
    expect(VIDEO_PRESETS.map((preset) => preset.fileNameLabel)).toEqual(["720p", "1080p", "4K"]);
  });

  it("finds a preset by id", () => {
    expect(presetById("4k").size).toEqual({ width: 3840, height: 2160 });
  });
});

describe("video export frames", () => {
  it.each([
    [3000, 90],
    [3010, 91],
    [1, 1],
    [340_000, 10_200],
  ])("a %i ms slideshow has %i frames at 30 per second, the last one partial", (ms, frames) => {
    expect(frameCount(ms)).toBe(frames);
  });

  it("shows frame n at n / 30 s, the last one clamped to the slideshow's end", () => {
    expect(frameTimeSeconds(0, 3010)).toBe(0);
    expect(frameTimeSeconds(45, 3010)).toBe(1.5);
    expect(frameTimeSeconds(90, 3010)).toBe(3);
    expect(frameTimeSeconds(91, 3010)).toBe(3.01);
  });

  it("stamps frame n at round(n × 10⁶ / 30) µs and lasts until the next one", () => {
    expect([0, 1, 2, 3].map(frameTimestampUs)).toEqual([0, 33_333, 66_667, 100_000]);
    expect([0, 1, 2].map(frameDurationUs)).toEqual([33_333, 33_334, 33_333]);
  });

  it("makes every 60th frame, from the first, a keyframe", () => {
    expect([0, 1, 30, 59, 60, 61, 120].map(isKeyFrame)).toEqual([
      true,
      false,
      false,
      false,
      true,
      false,
      true,
    ]);
  });
});

describe("video export size estimate", () => {
  it("is (video + audio bitrate) × duration / 8", () => {
    expect(estimatedBytes(presetById("1080p"), 340_000, true)).toBe(
      ((8_000_000 + 160_000) * 340) / 8,
    );
  });

  it("counts no audio for a slideshow without music", () => {
    expect(estimatedBytes(presetById("720p"), 10_000, false)).toBe((4_000_000 * 10) / 8);
  });
});

describe("video export audio segments", () => {
  it("cuts the audio, exactly as long as the video, into 30 s segments at 48 kHz", () => {
    // 2000 frames: 66.67 s, 3_200_000 samples.
    expect(audioSegments(2000)).toEqual([
      { startSample: 0, sampleCount: 1_440_000, timestampUs: 0 },
      { startSample: 1_440_000, sampleCount: 1_440_000, timestampUs: 30_000_000 },
      { startSample: 2_880_000, sampleCount: 320_000, timestampUs: 60_000_000 },
    ]);
  });

  it("has a single short segment for a short video", () => {
    expect(audioSegments(90)).toEqual([{ startSample: 0, sampleCount: 144_000, timestampUs: 0 }]);
  });
});

describe("video export packet-count bounds", () => {
  it("allows one video packet per frame", () => {
    expect(packetCountBounds(10_200).video).toBe(10_200);
  });

  it("allows at least one audio packet per 10 ms, more than AAC's or Opus's need", () => {
    const { audio } = packetCountBounds(10_200);
    const aacPackets = Math.ceil((340 * 48_000) / 1024);
    const opusPackets = Math.ceil(340 / 0.02);
    expect(audio).toBeGreaterThanOrEqual(34_000);
    expect(audio).toBeGreaterThan(Math.max(aacPackets, opusPackets));
  });
});

describe("video export file name", () => {
  it("is the title with the preset: <title> (4K).mp4", () => {
    expect(exportFileName("Sommer 2025", "4k")).toBe("Sommer 2025 (4K).mp4");
  });

  it("replaces characters no file name may hold", () => {
    expect(exportFileName('Paris/Rom: "Best of"?', "720p")).toBe(
      "Paris-Rom- -Best of-- (720p).mp4",
    );
  });
});
