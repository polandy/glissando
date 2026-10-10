import { ALL_FORMATS, BlobSource, EncodedPacketSink, Input } from "mediabunny";
import { describe, expect, it } from "vitest";
import { server } from "vitest/browser";
import type { Slide, Slideshow } from "../../player";
import {
  exportFileName,
  privateExportTarget,
  probeVideoExport,
  runVideoExport,
  type ExportProgress,
} from "..";
import { memoryExportTarget } from "../testing/memory-target";
import { PRIVATE_EXPORT_FOLDER } from "./file-targets";

const SAMPLE_RATE = 48_000;
const TONE_HZ = 440;
const TONE_SECONDS = 4;
const SLIDE_MS = 1500;
/** Two 1.5 s slides: 90 frames at 30 per second. */
const EXPECTED_FRAMES = 90;
const PICTURE_SIZE = { width: 640, height: 480 };
/**
 * A ceiling, not a wait: a real software encode of 90 frames on a shared CI runner takes up to
 * about 20 s, past vitest's default of 15 s.
 */
const REAL_EXPORT_CEILING_MS = 60_000;

/** A generated picture, so no photo of anyone ever lands in a test. */
async function generatedPicture(colour: string, label: string): Promise<Blob> {
  const canvas = new OffscreenCanvas(PICTURE_SIZE.width, PICTURE_SIZE.height);
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("no 2D context to draw a test picture");
  }
  context.fillStyle = colour;
  context.fillRect(0, 0, PICTURE_SIZE.width, PICTURE_SIZE.height);
  context.fillStyle = "white";
  context.font = "120px sans-serif";
  context.fillText(label, 40, 200);
  return canvas.convertToBlob({ type: "image/png" });
}

/** A stereo 16-bit WAV of a sine tone. */
function generatedTone(): Blob {
  const channels = 2;
  const bytesPerSample = 2;
  const frames = SAMPLE_RATE * TONE_SECONDS;
  const dataBytes = frames * channels * bytesPerSample;
  const view = new DataView(new ArrayBuffer(44 + dataBytes));
  const ascii = (offset: number, text: string) =>
    [...text].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  ascii(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  ascii(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, 8 * bytesPerSample, true);
  ascii(36, "data");
  view.setUint32(40, dataBytes, true);
  for (let frame = 0; frame < frames; frame += 1) {
    const sample = Math.round(Math.sin((2 * Math.PI * TONE_HZ * frame) / SAMPLE_RATE) * 8000);
    for (let channel = 0; channel < channels; channel += 1) {
      view.setInt16(44 + (frame * channels + channel) * bytesPerSample, sample, true);
    }
  }
  return new Blob([view.buffer], { type: "audio/wav" });
}

function slide(src: string, caption?: string): Slide {
  return {
    image: { src, capturedAt: "2025-07-01T10:00:00Z" },
    durationMs: SLIDE_MS,
    kenBurns: {
      from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
      to: { zoom: 1.2, centerX: 0.5, centerY: 0.5 },
      easing: "linear",
    },
    ...(caption === undefined ? {} : { caption }),
  };
}

const SLIDESHOW: Slideshow = {
  formatVersion: 2,
  title: "Generated",
  music: { src: "tone", startMs: 500, fadeInMs: 500, fadeOutMs: 0 },
  slides: [
    { ...slide("first", "A caption"), transitionToNext: { effect: "crossfade", durationMs: 500 } },
    slide("second"),
  ],
};

/** Runs the export of `SLIDESHOW` at 720p into a fresh target. */
async function exportGenerated(
  signal: AbortSignal,
  onProgress: (progress: ExportProgress) => void,
) {
  const capabilities = await probeVideoExport({ withMusic: true });
  if (!capabilities.supported) {
    throw new Error(`this engine cannot export: ${capabilities.reason}`);
  }
  const pictures = new Map([
    ["first", await generatedPicture("#c0392b", "1")],
    ["second", await generatedPicture("#2471a3", "2")],
  ]);
  const fileName = exportFileName("Generated", "720p");
  // WebKit under Playwright has no origin private file system; the others write to it.
  const target =
    server.browser === "webkit"
      ? memoryExportTarget(fileName)
      : await privateExportTarget(fileName);
  const result = await runVideoExport({
    slideshow: SLIDESHOW,
    openPicture: (src) => {
      const picture = pictures.get(src);
      return picture === undefined
        ? Promise.reject(new Error(`no generated picture ${src}`))
        : Promise.resolve(picture);
    },
    musicFile: generatedTone(),
    preset: "720p",
    audioCodec: capabilities.audioCodec,
    target,
    signal,
    onProgress,
  });
  return { result, target, capabilities };
}

async function privateExportNames(): Promise<string[]> {
  const root = await navigator.storage.getDirectory();
  const folder = await root.getDirectoryHandle(PRIVATE_EXPORT_FOLDER, { create: true });
  const names: string[] = [];
  for await (const name of folder.keys()) {
    names.push(name);
  }
  return names;
}

describe("runVideoExport", () => {
  it(
    "writes a 720p MP4 with every frame and the music track the browser can encode",
    async () => {
      const progress: ExportProgress[] = [];

      const { result, target, capabilities } = await exportGenerated(
        new AbortController().signal,
        (update) => progress.push(update),
      );

      if (result.kind !== "done") {
        throw new Error(`the export ended ${result.kind}`, {
          cause: result.kind === "failed" ? result.error : result,
        });
      }
      expect(progress.at(-1)).toMatchObject({
        framesDone: EXPECTED_FRAMES,
        framesTotal: EXPECTED_FRAMES,
      });
      const input = new Input({ source: new BlobSource(result.file), formats: ALL_FORMATS });
      const video = await input.getPrimaryVideoTrack();
      const audio = await input.getPrimaryAudioTrack();
      expect(video?.codec).toBe("avc");
      expect([video?.displayWidth, video?.displayHeight]).toEqual([1280, 720]);
      if (video === null) {
        throw new Error("the file has no video track");
      }
      const sink = new EncodedPacketSink(video);
      let packets = 0;
      for (let packet = await sink.getFirstPacket(); packet !== null;) {
        packets += 1;
        packet = await sink.getNextPacket(packet);
      }
      expect(packets).toBe(EXPECTED_FRAMES);
      expect(audio?.codec).toBe(capabilities.audioCodec);
      expect(await input.computeDuration()).toBeCloseTo(3, 1);
      input.dispose();
      await target.discard();
    },
    REAL_EXPORT_CEILING_MS,
  );

  it(
    "stops at once on abort and leaves no file behind",
    async () => {
      const controller = new AbortController();
      const progress: ExportProgress[] = [];

      const { result } = await exportGenerated(controller.signal, (update) => {
        progress.push(update);
        if (update.framesDone === 10) {
          controller.abort();
        }
      });

      expect(result).toEqual({ kind: "cancelled" });
      expect(progress.at(-1)?.framesDone).toBe(10);
      if (server.browser !== "webkit") {
        expect(await privateExportNames()).toEqual([]);
      }
    },
    REAL_EXPORT_CEILING_MS,
  );
});
