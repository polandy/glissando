import type { Slide, Slideshow } from "../../player";

const SAMPLE_RATE = 48_000;
const TONE_HZ = 440;
const TONE_SECONDS = 4;
const SLIDE_MS = 1500;
const PICTURE_SIZE = { width: 640, height: 480 };

/** A generated picture, so no photo of anyone ever lands in a test. */
export async function generatedPicture(colour: string, label: string): Promise<Blob> {
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
export function generatedTone(): Blob {
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

export const GENERATED_SLIDESHOW: Slideshow = {
  formatVersion: 9,
  title: "Generated",
  music: [
    { src: "tone", atMs: 0, startMs: 500, endMs: 600_000, fadeInMs: 500, fadeOutMs: 0, gain: 1 },
  ],
  slides: [
    { ...slide("first", "A caption"), transitionToNext: { effect: "crossfade", durationMs: 500 } },
    slide("second"),
  ],
};
