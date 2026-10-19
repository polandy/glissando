import { beforeAll, describe, expect, it } from "vitest";
import { server } from "vitest/browser";
import type { Slideshow } from "../../player";
import { probeVideoExport, runVideoExport } from "..";
import { generatedClip, solidPicture } from "../testing/generated-clip";
import { memoryExportTarget } from "../testing/memory-target";
import { decodeClipSound } from "./decode-clip-sound";

/** A software encode of a short clip can take a while on a shared runner; a ceiling, not a wait. */
const GENERATION_CEILING_MS = 60_000;
const CLIP_MS = 1500;
const TONE_AMPLITUDE = 0.5;
const CAPTURED_AT = "2026-07-01T10:00:00Z";
// An AAC or Opus frame's duration; the clip's decoded length may be short by at most one.
const CODEC_FRAME_TOLERANCE_SECONDS = 0.1;
const STILL_MOTION = {
  from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
  to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
  easing: "linear",
} as const;

/** A clip with no music and no video sound, so the export writes no audio track at all. */
async function clipWithoutSound(colour: string, durationMs: number): Promise<Blob> {
  const capabilities = await probeVideoExport({ withAudio: false });
  if (!capabilities.supported) {
    throw new Error(`this engine cannot export: ${capabilities.reason}`);
  }
  const slideshow: Slideshow = {
    formatVersion: 7,
    title: "Clip without sound",
    slides: [
      { image: { src: "solid", capturedAt: CAPTURED_AT }, durationMs, kenBurns: STILL_MOTION },
    ],
  };
  const picture = await solidPicture(colour);
  const result = await runVideoExport({
    slideshow,
    openPicture: () => Promise.resolve(picture),
    openMusic: () => Promise.reject(new Error("a clip without sound never opens music")),
    preset: "720p",
    audioCodec: capabilities.audioCodec,
    target: memoryExportTarget("clip-without-sound.mp4"),
    signal: new AbortController().signal,
  });
  if (result.kind !== "done") {
    throw new Error(`the generated clip's export ended ${result.kind}`);
  }
  return result.file;
}

/** The largest absolute sample across every channel, in `[fromSeconds, toSeconds)`. */
function peak(buffer: AudioBuffer, fromSeconds: number, toSeconds: number): number {
  const from = Math.floor(fromSeconds * buffer.sampleRate);
  const to = Math.ceil(toSeconds * buffer.sampleRate);
  let highest = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel).subarray(from, to);
    for (const sample of data) {
      highest = Math.max(highest, Math.abs(sample));
    }
  }
  return highest;
}

let tonedClip: Blob;
let silentClip: Blob;
beforeAll(async () => {
  tonedClip = await generatedClip("#ff0000", CLIP_MS, TONE_AMPLITUDE);
  silentClip = await clipWithoutSound("#00ff00", CLIP_MS);
}, GENERATION_CEILING_MS);

describe("decodeClipSound", () => {
  // WebKit's AAC encoder stamps every packet 0, so a clip it wrote has no sound to place in time.
  it.skipIf(server.browser === "webkit")(
    "decodes a clip's whole sound into one buffer spanning its duration, the tone throughout",
    async () => {
      const sound = await decodeClipSound(tonedClip);

      if (sound === null) {
        throw new Error("a clip with a sound track must decode one");
      }
      expect(sound.duration).toBeGreaterThan(CLIP_MS / 1000 - CODEC_FRAME_TOLERANCE_SECONDS);
      expect(sound.duration).toBeLessThan(CLIP_MS / 1000 + CODEC_FRAME_TOLERANCE_SECONDS);
      expect(peak(sound, 0, 0.3)).toBeGreaterThan(TONE_AMPLITUDE * 0.3);
      expect(peak(sound, 0.6, 0.9)).toBeGreaterThan(TONE_AMPLITUDE * 0.3);
      expect(peak(sound, 1.1, 1.4)).toBeGreaterThan(TONE_AMPLITUDE * 0.3);
    },
    GENERATION_CEILING_MS,
  );

  it("is null for a clip with no sound track", async () => {
    expect(await decodeClipSound(silentClip)).toBeNull();
  });

  it("is null for a file mediabunny cannot open", async () => {
    expect(await decodeClipSound(new Blob(["nope"]))).toBeNull();
  });
});
