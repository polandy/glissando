import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { TestFile } from "./media";

const FRAME_SIZE = { width: 320, height: 240 } as const;
/** Node's Buffer, which Playwright's file payloads are (see media.ts). */
declare const Buffer: { from(text: string, encoding: "base64"): Uint8Array };

const BROWSER_BUNDLE = new URL(
  "../../node_modules/mediabunny/dist/bundles/mediabunny.min.cjs",
  import.meta.url,
);
const FRAMES_PER_SECOND = 10;
const AUDIO_SAMPLE_RATE = 48_000;
const AUDIO_BITRATE = 64_000;
const TONE_FREQUENCY_HZ = 440;
const TONE_AMPLITUDE = 0.8;

/** A generated clip's sound: a loud sine tone for its first `toneSeconds`, silence after. */
export type ClipAudio = { toneSeconds: number };

/**
 * A real MP4 clip of `colour` lasting `seconds`, encoded in the page by the browser's own
 * WebCodecs through mediabunny's bundle, so the app's importer reads what an encoder wrote.
 * Only an engine that encodes H.264 can make it. With `audio`, an Opus sound track is added too
 * (Chromium's test build has no AAC encoder); without it the clip keeps having no sound track.
 */
export async function generatedClip(
  page: Page,
  name: string,
  colour: string,
  seconds: number,
  audio?: ClipAudio,
): Promise<TestFile> {
  const bundle = new TextDecoder().decode(readFileSync(BROWSER_BUNDLE));
  const encoded = await page.evaluate(
    async ({
      source,
      fill,
      length,
      size,
      rate,
      toneSeconds,
      sampleRate,
      bitrate,
      frequency,
      amplitude,
    }) => {
      const exports: Record<string, unknown> = {};
      new Function("module", "exports", source)({ exports }, exports);
      const {
        Output,
        Mp4OutputFormat,
        BufferTarget,
        CanvasSource,
        AudioBufferSource,
        canEncodeAudio,
      } = exports as typeof import("mediabunny");
      const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
      const canvas = new OffscreenCanvas(size.width, size.height);
      const context = canvas.getContext("2d");
      if (context === null) {
        throw new Error("no 2D context to draw a test clip");
      }
      const frames = new CanvasSource(canvas, { codec: "avc", bitrate: 1_000_000 });
      output.addVideoTrack(frames, { frameRate: rate });

      let sound: InstanceType<typeof AudioBufferSource> | null = null;
      if (toneSeconds !== null) {
        const canEncode = await canEncodeAudio("opus", { numberOfChannels: 1, sampleRate });
        if (!canEncode) {
          throw new Error("this browser cannot encode an opus sound track for a test clip");
        }
        sound = new AudioBufferSource({ codec: "opus", bitrate });
        output.addAudioTrack(sound);
      }

      await output.start();
      for (let frame = 0; frame < length * rate; frame += 1) {
        context.fillStyle = fill;
        context.fillRect(0, 0, size.width, size.height);
        await frames.add(frame / rate, 1 / rate);
      }
      if (sound !== null && toneSeconds !== null) {
        const buffer = new AudioBuffer({
          length: Math.round(length * sampleRate),
          numberOfChannels: 1,
          sampleRate,
        });
        const channel = buffer.getChannelData(0);
        const toneFrames = Math.round(toneSeconds * sampleRate);
        for (let index = 0; index < toneFrames; index += 1) {
          channel[index] = amplitude * Math.sin((2 * Math.PI * frequency * index) / sampleRate);
        }
        await sound.add(buffer);
      }
      await output.finalize();
      const target = output.target as InstanceType<typeof BufferTarget>;
      const reader = new FileReader();
      const read = new Promise<string>((resolve) => {
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      });
      reader.readAsDataURL(new Blob([target.buffer ?? new ArrayBuffer(0)]));
      return read;
    },
    {
      source: bundle,
      fill: colour,
      length: seconds,
      size: FRAME_SIZE,
      rate: FRAMES_PER_SECOND,
      toneSeconds: audio?.toneSeconds ?? null,
      sampleRate: AUDIO_SAMPLE_RATE,
      bitrate: AUDIO_BITRATE,
      frequency: TONE_FREQUENCY_HZ,
      amplitude: TONE_AMPLITUDE,
    },
  );
  return { name, mimeType: "video/mp4", buffer: Buffer.from(encoded, "base64") };
}
