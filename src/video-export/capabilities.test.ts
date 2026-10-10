import { describe, expect, it } from "vitest";
import { probeCapabilities, type CapabilityProbe } from "./capabilities";

/** A browser whose encoders accept exactly the codecs listed. */
function browser({
  videoCodecs = ["avc1.640028", "avc1.640033"],
  audioCodecs = ["mp4a.40.2", "opus"],
  hasVideoEncoder = true,
  hasWebGl2 = true,
}: {
  videoCodecs?: readonly string[];
  audioCodecs?: readonly string[];
  hasVideoEncoder?: boolean;
  hasWebGl2?: boolean;
} = {}) {
  const asked: string[] = [];
  const probe: CapabilityProbe = {
    hasVideoEncoder,
    hasWebGl2,
    isVideoConfigSupported: (config) => {
      asked.push(`${config.codec} ${config.width}x${config.height}`);
      return Promise.resolve(videoCodecs.includes(config.codec));
    },
    isAudioConfigSupported: (config) => {
      asked.push(config.codec);
      return Promise.resolve(audioCodecs.includes(config.codec));
    },
  };
  return { probe, asked };
}

describe("video export capabilities", () => {
  it("offers every preset the encoder accepts, 1080p by default, AAC for the music", async () => {
    const { probe } = browser();

    const capabilities = await probeCapabilities(probe, { withMusic: true });

    expect(capabilities).toEqual({
      supported: true,
      available: ["720p", "1080p", "4k"],
      defaultPreset: "1080p",
      audioCodec: "aac",
    });
  });

  it("asks for each preset's exact size and codec", async () => {
    const { probe, asked } = browser();

    await probeCapabilities(probe, { withMusic: false });

    expect(asked).toEqual([
      "avc1.640028 1280x720",
      "avc1.640028 1920x1080",
      "avc1.640033 3840x2160",
    ]);
  });

  it("greys out a preset the encoder refuses", async () => {
    const { probe } = browser({ videoCodecs: ["avc1.640028"] });

    const capabilities = await probeCapabilities(probe, { withMusic: false });

    expect(capabilities).toMatchObject({ available: ["720p", "1080p"], defaultPreset: "1080p" });
  });

  it("defaults to the largest available preset when 1080p is refused", async () => {
    const { probe } = browser();
    const refuse1080p: CapabilityProbe = {
      ...probe,
      isVideoConfigSupported: (config) => Promise.resolve(config.width !== 1920),
    };

    const capabilities = await probeCapabilities(refuse1080p, { withMusic: false });

    expect(capabilities).toMatchObject({ available: ["720p", "4k"], defaultPreset: "4k" });
  });

  it("falls back to Opus where the browser has no AAC encoder", async () => {
    const { probe } = browser({ audioCodecs: ["opus"] });

    const capabilities = await probeCapabilities(probe, { withMusic: true });

    expect(capabilities).toMatchObject({ supported: true, audioCodec: "opus" });
  });

  it("asks nothing about audio for a slideshow without music, which gets no audio track", async () => {
    const { probe, asked } = browser({ audioCodecs: [] });

    const capabilities = await probeCapabilities(probe, { withMusic: false });

    expect(capabilities).toMatchObject({ supported: true, audioCodec: null });
    expect(asked.every((question) => question.startsWith("avc1"))).toBe(true);
  });

  it.each([
    ["no-video-encoder", { hasVideoEncoder: false }, true],
    ["no-webgl2", { hasWebGl2: false }, true],
    ["no-preset", { videoCodecs: [] }, true],
    ["no-audio-codec", { audioCodecs: [] }, true],
  ] as const)("is unsupported as a whole: %s", async (reason, setup, withMusic) => {
    const { probe } = browser(setup);

    expect(await probeCapabilities(probe, { withMusic })).toEqual({ supported: false, reason });
  });
});
