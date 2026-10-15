import { afterEach, describe, expect, it } from "vitest";
import { startPictureDecodeWorker } from "./start-picture-decode-worker";
import { WorkerPictureDecoder } from "./worker-picture-decoder";

const PICTURE_COUNT = 24;
const PICTURE_SIZE = { width: 64, height: 48 };
/** Neighbouring pictures differ by more than JPEG's rounding of a flat colour. */
const RED_STEP = 10;
const COLOUR_TOLERANCE = 4;

/** A JPEG of one flat colour: its red channel says which picture it is. */
async function jpegWithRed(red: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  Object.assign(canvas, PICTURE_SIZE);
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("no 2D canvas context to draw a test picture");
  }
  context.fillStyle = `rgb(${red} 0 0)`;
  context.fillRect(0, 0, PICTURE_SIZE.width, PICTURE_SIZE.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob === null ? reject(new Error("no JPEG")) : resolve(blob)),
      "image/jpeg",
      1,
    ),
  );
}

function redOf(bitmap: ImageBitmap): number {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("no 2D canvas context to read a bitmap");
  }
  context.drawImage(bitmap, 0, 0);
  return context.getImageData(bitmap.width / 2, bitmap.height / 2, 1, 1).data[0] ?? -1;
}

let worker: Worker | null = null;
afterEach(() => worker?.terminate());

describe("WorkerPictureDecoder with equally sized pictures decoded at once", () => {
  it("hands every picture its own bitmap", async () => {
    const decoder = new WorkerPictureDecoder(() => (worker = startPictureDecodeWorker()));
    const expectedReds = Array.from({ length: PICTURE_COUNT }, (_, index) => index * RED_STEP);
    const pictures = await Promise.all(expectedReds.map(jpegWithRed));

    const bitmaps = await Promise.all(pictures.map((picture) => decoder.decode(picture)));

    const reds = bitmaps.map(redOf);
    const off = reds.flatMap((red, index) =>
      Math.abs(red - (expectedReds[index] ?? -1)) > COLOUR_TOLERANCE ? [index] : [],
    );
    expect(off, "pictures that came back with another picture's bitmap").toEqual([]);
  });
});
