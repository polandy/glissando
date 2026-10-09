import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { silentWav } from "../../src/import/testing/silent-wav";
import { syntheticJpeg } from "../../src/import/testing/synthetic-jpeg";

/**
 * Node's Buffer, which Playwright's file payloads are. The project's types describe the browser
 * only, so the cases declare the part of it they use rather than pull in all of Node's types.
 */
declare const Buffer: {
  from(bytes: Uint8Array): Uint8Array;
  from(text: string, encoding: "base64" | "utf8"): Uint8Array;
  concat(list: readonly Uint8Array[]): Uint8Array;
};

/** A file as a file chooser takes it: built in the test, or a test picture the unit tests share. */
export interface TestFile {
  readonly name: string;
  readonly mimeType: string;
  readonly buffer: Uint8Array;
}

const PICTURE_WIDTH = 64;
const PICTURE_HEIGHT = 48;
const JPEG_START_OF_IMAGE_LENGTH = 2;
const SEGMENT_MARKER_LENGTH = 2;

/**
 * A real, decodable JPEG whose EXIF says it was taken on `day` ("YYYY-MM-DD", at noon): the
 * browser encodes a plain-coloured canvas, and the EXIF segment is spliced in after its start.
 */
export async function pictureTakenOn(
  page: Page,
  name: string,
  day: string,
  colour: string,
): Promise<TestFile> {
  const encoded = await page.evaluate(
    ({ width, height, fill }) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (context === null) {
        throw new Error("no 2D canvas context to draw a test picture");
      }
      context.fillStyle = fill;
      context.fillRect(0, 0, width, height);
      return canvas.toDataURL("image/jpeg").split(",")[1] ?? "";
    },
    { width: PICTURE_WIDTH, height: PICTURE_HEIGHT, fill: colour },
  );
  return {
    name,
    mimeType: "image/jpeg",
    buffer: withCaptureDay(Buffer.from(encoded, "base64"), day),
  };
}

/**
 * The public-domain NASA portrait of Eileen Collins that the face detector's own tests use, with
 * EXIF saying it was taken on `day`: a picture with a face to find.
 */
export function portraitTakenOn(name: string, day: string): TestFile {
  const portrait = readFileSync(
    new URL("../../src/focus/testing/astronaut-128.jpg", import.meta.url),
  );
  return { name, mimeType: "image/jpeg", buffer: withCaptureDay(portrait, day) };
}

/** `jpeg` with an EXIF segment saying it was taken on `day` (at noon), spliced in after its start. */
function withCaptureDay(jpeg: Uint8Array, day: string): Uint8Array {
  const exifDate = `${day.replaceAll("-", ":")} 12:00:00`;
  const exifSource = syntheticJpeg({ byteOrder: "little", dateTimeOriginal: exifDate }).bytes;
  const app1Start = JPEG_START_OF_IMAGE_LENGTH;
  const app1Length = SEGMENT_MARKER_LENGTH + ((exifSource[4] ?? 0) << 8) + (exifSource[5] ?? 0);
  const app1 = exifSource.subarray(app1Start, app1Start + app1Length);
  return Buffer.concat([
    jpeg.subarray(0, JPEG_START_OF_IMAGE_LENGTH),
    app1,
    jpeg.subarray(JPEG_START_OF_IMAGE_LENGTH),
  ]);
}

/** A file no browser reads as a picture. */
export function textFile(name: string): TestFile {
  return { name, mimeType: "text/plain", buffer: Buffer.from("not a picture\n", "utf8") };
}

/** A silent WAV track lasting `seconds`. */
export function silentTrack(name: string, seconds: number): TestFile {
  const millisecondsPerSecond = 1000;
  return {
    name,
    mimeType: "audio/wav",
    buffer: Buffer.from(silentWav(seconds * millisecondsPerSecond)),
  };
}

/** `blob` as a file chooser takes it, under `name`. */
export async function blobFile(name: string, blob: Blob): Promise<TestFile> {
  return {
    name,
    mimeType: "application/octet-stream",
    buffer: Buffer.from(new Uint8Array(await blob.arrayBuffer())),
  };
}
