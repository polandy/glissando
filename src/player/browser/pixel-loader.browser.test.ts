import { afterEach, describe, expect, it } from "vitest";
import { turnedByExif } from "../../import/testing/turned-by-exif";
import { openingOnly, PICTURE_ID } from "../testing/opened-pictures";
import { PixelLoader } from "./pixel-loader";
import { startPictureDecodeWorker } from "./start-picture-decode-worker";
import { PictureDecodeError, WorkerPictureDecoder } from "./worker-picture-decoder";

const WIDE = { width: 32, height: 16 };
/** JPEG rounding moves a flat red's channels by a few steps at most. */
const RED_AT_LEAST = 240;
const OTHER_AT_MOST = 16;

/** A JPEG of `size` drawn on a canvas, as a camera would store it. */
async function jpeg(size: { width: number; height: number }): Promise<Blob> {
  const canvas = document.createElement("canvas");
  Object.assign(canvas, size);
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("no 2D canvas context to draw a test picture");
  }
  context.fillStyle = "rgb(255 0 0)";
  context.fillRect(0, 0, size.width, size.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob === null ? reject(new Error("no JPEG")) : resolve(blob)),
      "image/jpeg",
    ),
  );
}

let worker: Worker | null = null;
afterEach(() => worker?.terminate());

function loaderOpening(picture: Blob): PixelLoader {
  const decoder = new WorkerPictureDecoder(() => (worker = startPictureDecodeWorker()));
  return new PixelLoader(decoder, openingOnly(PICTURE_ID, picture));
}

describe("PixelLoader", () => {
  it("decodes the opened picture in a worker into the RGBA bytes of its size", async () => {
    const picture = await loaderOpening(await jpeg(WIDE)).load(PICTURE_ID);

    expect({ width: picture.width, height: picture.height }).toEqual(WIDE);
    expect(picture.data).toHaveLength(WIDE.width * WIDE.height * 4);
    const [red = 0, green = 255, blue = 255, alpha = 0] = picture.data;
    expect(red).toBeGreaterThan(RED_AT_LEAST);
    expect(Math.max(green, blue)).toBeLessThan(OTHER_AT_MOST);
    expect(alpha).toBe(255);
  });

  it("loads a src that is a URL without openPicture", async () => {
    const decoder = new WorkerPictureDecoder(() => (worker = startPictureDecodeWorker()));
    const url = URL.createObjectURL(await jpeg(WIDE));
    try {
      const picture = await new PixelLoader(decoder).load(url);

      expect({ width: picture.width, height: picture.height }).toEqual(WIDE);
    } finally {
      URL.revokeObjectURL(url);
    }
  });

  it("turns the picture upright by its EXIF orientation, as an <img> does", async () => {
    const picture = await loaderOpening(await turnedByExif(await jpeg(WIDE))).load(PICTURE_ID);

    expect({ width: picture.width, height: picture.height }).toEqual({ width: 16, height: 32 });
  });

  it("rejects a picture the browser cannot decode", async () => {
    const loader = loaderOpening(new Blob(["not a picture"], { type: "image/jpeg" }));

    await expect(loader.load(PICTURE_ID)).rejects.toBeInstanceOf(PictureDecodeError);
  });
});
