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

/**
 * A real MP4 clip of `colour` lasting `seconds`, encoded in the page by the browser's own
 * WebCodecs through mediabunny's bundle, so the app's importer reads what an encoder wrote.
 * Only an engine that encodes H.264 can make it.
 */
export async function generatedClip(
  page: Page,
  name: string,
  colour: string,
  seconds: number,
): Promise<TestFile> {
  const bundle = new TextDecoder().decode(readFileSync(BROWSER_BUNDLE));
  const encoded = await page.evaluate(
    async ({ source, fill, length, size, rate }) => {
      const exports: Record<string, unknown> = {};
      new Function("module", "exports", source)({ exports }, exports);
      const { Output, Mp4OutputFormat, BufferTarget, CanvasSource } =
        exports as typeof import("mediabunny");
      const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
      const canvas = new OffscreenCanvas(size.width, size.height);
      const context = canvas.getContext("2d");
      if (context === null) {
        throw new Error("no 2D context to draw a test clip");
      }
      const frames = new CanvasSource(canvas, { codec: "avc", bitrate: 1_000_000 });
      output.addVideoTrack(frames, { frameRate: rate });
      await output.start();
      for (let frame = 0; frame < length * rate; frame += 1) {
        context.fillStyle = fill;
        context.fillRect(0, 0, size.width, size.height);
        await frames.add(frame / rate, 1 / rate);
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
    { source: bundle, fill: colour, length: seconds, size: FRAME_SIZE, rate: FRAMES_PER_SECOND },
  );
  return { name, mimeType: "video/mp4", buffer: Buffer.from(encoded, "base64") };
}
