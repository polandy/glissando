import { afterEach, describe, expect, it } from "vitest";
import { turnedByExif } from "../../import/testing/turned-by-exif";
import { openingOnly, PICTURE_ID } from "../testing/opened-pictures";
import { BitmapLoader } from "./bitmap-loader";
import { startPictureDecodeWorker } from "./start-picture-decode-worker";
import { PictureDecodeError, WorkerPictureDecoder } from "./worker-picture-decoder";

const WIDE = { width: 32, height: 16 };

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

function loaderOpening(picture: Blob): BitmapLoader {
  const decoder = new WorkerPictureDecoder(() => (worker = startPictureDecodeWorker()));
  return new BitmapLoader(decoder, openingOnly(PICTURE_ID, picture));
}

describe("BitmapLoader", () => {
  it("decodes the opened picture in a worker into a bitmap of its size", async () => {
    const picture = await loaderOpening(await jpeg(WIDE)).load(PICTURE_ID);

    expect(picture.bitmap).toBeInstanceOf(ImageBitmap);
    expect({ width: picture.width, height: picture.height }).toEqual(WIDE);
  });

  it("loads a src that is a URL without openPicture", async () => {
    const decoder = new WorkerPictureDecoder(() => (worker = startPictureDecodeWorker()));
    const url = URL.createObjectURL(await jpeg(WIDE));
    try {
      const picture = await new BitmapLoader(decoder).load(url);

      expect({ width: picture.width, height: picture.height }).toEqual(WIDE);
    } finally {
      URL.revokeObjectURL(url);
    }
  });

  it("turns the picture upright by its EXIF orientation, as an <img> does", async () => {
    const picture = await loaderOpening(await turnedByExif(await jpeg(WIDE))).load(PICTURE_ID);

    expect({ width: picture.width, height: picture.height }).toEqual({ width: 16, height: 32 });
  });

  it("closes the bitmap on release", async () => {
    const loader = loaderOpening(await jpeg(WIDE));
    const picture = await loader.load(PICTURE_ID);
    expect(picture.bitmap.width).toBe(WIDE.width);

    loader.release(picture);

    expect(picture.bitmap.width).toBe(0);
  });

  it("rejects a picture the browser cannot decode", async () => {
    const loader = loaderOpening(new Blob(["not a picture"], { type: "image/jpeg" }));

    await expect(loader.load(PICTURE_ID)).rejects.toBeInstanceOf(PictureDecodeError);
  });
});
