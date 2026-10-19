import { runVideoExport, probeVideoExport } from "..";
import type { Slideshow } from "../../player";
import { memoryExportTarget } from "./memory-target";

const SAMPLE_RATE = 48_000;
const TONE_HZ = 440;
const TONE_SECONDS = 4;
const PICTURE_SIZE = { width: 640, height: 480 };
const MS_PER_SECOND = 1000;

/** A stereo 16-bit WAV of a sine tone of `amplitude` (0 to 1). */
export function sineWav(amplitude: number): Blob {
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
    const sample = Math.round(
      Math.sin((2 * Math.PI * TONE_HZ * frame) / SAMPLE_RATE) * amplitude * 0x7fff,
    );
    for (let channel = 0; channel < channels; channel += 1) {
      view.setInt16(44 + (frame * channels + channel) * bytesPerSample, sample, true);
    }
  }
  return new Blob([view.buffer], { type: "audio/wav" });
}

/** A solid-colour picture, generated so no photo of anyone lands in a test. */
export async function solidPicture(colour: string): Promise<Blob> {
  const canvas = new OffscreenCanvas(PICTURE_SIZE.width, PICTURE_SIZE.height);
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("no 2D context to draw a test picture");
  }
  context.fillStyle = colour;
  context.fillRect(0, 0, PICTURE_SIZE.width, PICTURE_SIZE.height);
  return canvas.convertToBlob({ type: "image/png" });
}

/**
 * A real MP4 clip of `colour` lasting `durationMs`, with a 440 Hz tone at `amplitude`, made by
 * this browser's own export, so the decoders under test read what an encoder here wrote.
 */
export async function generatedClip(
  colour: string,
  durationMs: number,
  amplitude: number,
): Promise<Blob> {
  const capabilities = await probeVideoExport({ withAudio: true });
  if (!capabilities.supported) {
    throw new Error(`this engine cannot export: ${capabilities.reason}`);
  }
  const slideshow: Slideshow = {
    formatVersion: 8,
    title: "Clip",
    music: [
      {
        src: "tone",
        atMs: 0,
        startMs: 0,
        endMs: TONE_SECONDS * MS_PER_SECOND,
        fadeInMs: 0,
        fadeOutMs: 0,
        gain: 1,
      },
    ],
    slides: [
      {
        image: { src: "solid", capturedAt: "2025-07-01T10:00:00Z" },
        durationMs,
        kenBurns: {
          from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
          to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
          easing: "linear",
        },
      },
    ],
  };
  const picture = await solidPicture(colour);
  const result = await runVideoExport({
    slideshow,
    openPicture: () => Promise.resolve(picture),
    openMusic: () => Promise.resolve(sineWav(amplitude)),
    preset: "720p",
    audioCodec: capabilities.audioCodec,
    target: memoryExportTarget("clip.mp4"),
    signal: new AbortController().signal,
  });
  if (result.kind !== "done") {
    throw new Error(`the generated clip's export ended ${result.kind}`);
  }
  return result.file;
}
