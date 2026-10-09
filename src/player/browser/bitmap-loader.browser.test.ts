import { afterEach, describe, expect, it } from "vitest";
import { openingOnly, PICTURE_ID } from "../testing/opened-pictures";
import { BitmapLoader } from "./bitmap-loader";
import { startPictureDecodeWorker, WorkerPictureDecoder } from "./worker-picture-decoder";

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

/**
 * An APP1 segment whose EXIF says "rotate 90° clockwise to view" (Orientation 6): big-endian
 * TIFF header, one IFD with the single Orientation tag.
 */
// prettier-ignore
const EXIF_ORIENTATION_6 = new Uint8Array([
  0xff, 0xe1, 0x00, 0x22,
  0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
  0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08,
  0x00, 0x01,
  0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, 0x06, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,
]);
const JPEG_START_OF_IMAGE = 0xffd8;
const JFIF_MARKER = 0xffe0;
const MARKER_BYTES = 2;

/** Where the EXIF segment goes: after the start of image and the JFIF segment, if there is one. */
function exifOffset(jpegBytes: Uint8Array): number {
  const view = new DataView(jpegBytes.buffer, jpegBytes.byteOffset, jpegBytes.byteLength);
  if (view.getUint16(0) !== JPEG_START_OF_IMAGE) {
    throw new Error("the test picture is no JPEG");
  }
  return view.getUint16(MARKER_BYTES) === JFIF_MARKER
    ? MARKER_BYTES + MARKER_BYTES + view.getUint16(MARKER_BYTES + MARKER_BYTES)
    : MARKER_BYTES;
}

async function turnedByExif(picture: Blob): Promise<Blob> {
  const bytes = new Uint8Array(await picture.arrayBuffer());
  const offset = exifOffset(bytes);
  return new Blob([bytes.subarray(0, offset), EXIF_ORIENTATION_6, bytes.subarray(offset)], {
    type: "image/jpeg",
  });
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

    await expect(loader.load(PICTURE_ID)).rejects.toThrow();
  });
});
