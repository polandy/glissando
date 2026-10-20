import { beforeAll, describe, expect, it } from "vitest";
import { server } from "vitest/browser";
import type { Slideshow } from "../../player";
import { probeVideoExport, runVideoExport } from "../../video-export";
import { generatedClip, solidPicture } from "../../video-export/testing/generated-clip";
import { memoryExportTarget } from "../../video-export/testing/memory-target";
import type { ClipSoundWave } from "./clip-sound-wave";
import { readClipPeaksWithMediabunny } from "./read-clip-peaks";

/** A software encode of a short clip can take a while on a shared runner; a ceiling, not a wait. */
const GENERATION_CEILING_MS = 60_000;
const CLIP_MS = 1500;
const TONE_AMPLITUDE = 0.5;
const CAPTURED_AT = "2026-07-01T10:00:00Z";
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
    formatVersion: 8,
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

let tonedClip: Blob;
let silentClip: Blob;
beforeAll(async () => {
  tonedClip = await generatedClip("#ff0000", CLIP_MS, TONE_AMPLITUDE);
  silentClip = await clipWithoutSound("#00ff00", CLIP_MS);
}, GENERATION_CEILING_MS);

function collectWaves(): { reports: ClipSoundWave[]; onWave: (wave: ClipSoundWave) => void } {
  const reports: ClipSoundWave[] = [];
  return { reports, onWave: (wave) => reports.push(wave) };
}

describe("readClipPeaksWithMediabunny", () => {
  // WebKit's AAC encoder stamps every packet 0, so a clip it wrote has no sound to place in time.
  it.skipIf(server.browser === "webkit")(
    "reports a tone's peaks across the clip, all zero first and nonzero throughout by the last",
    async () => {
      const { reports, onWave } = collectWaves();

      await readClipPeaksWithMediabunny(tonedClip, CLIP_MS, new AbortController().signal, onWave);

      expect(reports.length).toBeGreaterThan(1);
      const first = reports[0];
      if (first?.kind !== "peaks") throw new Error("the first report must carry peaks");
      expect(first.peaks.every((peak) => peak === 0)).toBe(true);
      const last = reports[reports.length - 1];
      if (last?.kind !== "peaks") throw new Error("the last report must carry peaks");
      expect(Math.min(...last.peaks)).toBeGreaterThan(0);
    },
    GENERATION_CEILING_MS,
  );

  it("reports no sound, once, for a clip with no audio track", async () => {
    const { reports, onWave } = collectWaves();

    await readClipPeaksWithMediabunny(silentClip, CLIP_MS, new AbortController().signal, onWave);

    expect(reports).toEqual([{ kind: "no sound" }]);
  });

  it("reports nothing and resolves when the signal is already aborted", async () => {
    const { reports, onWave } = collectWaves();
    const controller = new AbortController();
    controller.abort();

    await readClipPeaksWithMediabunny(tonedClip, CLIP_MS, controller.signal, onWave);

    expect(reports).toEqual([]);
  });

  it(
    "takes no further report once aborted from inside onWave after the first",
    async () => {
      const controller = new AbortController();
      const reports: ClipSoundWave[] = [];

      await readClipPeaksWithMediabunny(tonedClip, CLIP_MS, controller.signal, (wave) => {
        reports.push(wave);
        controller.abort();
      });

      expect(reports.length).toBe(1);
    },
    GENERATION_CEILING_MS,
  );

  it("fails loud for a file mediabunny cannot open", async () => {
    await expect(
      readClipPeaksWithMediabunny(
        new Blob(["nope"]),
        CLIP_MS,
        new AbortController().signal,
        () => {},
      ),
    ).rejects.toThrow();
  });
});
