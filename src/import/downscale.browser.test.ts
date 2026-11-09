import { describe, expect, it } from "vitest";
import { decodePicture, thumbnailFromImage } from "./downscale";
import type { PictureLimits } from "./picture-limits";
import { UnreadablePictureError } from "./unreadable-picture";

const ROOMY_LIMITS: PictureLimits = {
  bytes: Number.MAX_SAFE_INTEGER,
  pixels: Number.MAX_SAFE_INTEGER,
};

/** Only a PNG's signature and IHDR, claiming `width` x `height`: nothing a decoder could draw. */
function pngHeaderClaiming(width: number, height: number): File {
  const header = new Uint8Array(33);
  const view = new DataView(header.buffer);
  header.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  view.setUint32(8, 13);
  header.set([0x49, 0x48, 0x44, 0x52], 12);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return new File([header], "claims-a-lot.png", { type: "image/png" });
}

async function rejection(promise: Promise<unknown>): Promise<UnreadablePictureError> {
  const error: unknown = await promise.then(
    () => undefined,
    (rejected: unknown) => rejected,
  );
  expect(error).toBeInstanceOf(UnreadablePictureError);
  return error as UnreadablePictureError;
}

async function pngFile(width: number, height: number): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("this browser has no 2D canvas");
  }
  context.fillStyle = "#c05080";
  context.fillRect(0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (blob === null) {
    throw new Error("the canvas did not encode a PNG");
  }
  return new File([blob], "generated.png", { type: "image/png" });
}

async function sizeOf(blob: Blob): Promise<{ width: number; height: number; type: string }> {
  const bitmap = await createImageBitmap(blob);
  const size = { width: bitmap.width, height: bitmap.height, type: blob.type };
  bitmap.close();
  return size;
}

describe("decodePicture", () => {
  it("downscales a large picture to the display and thumbnail bounds as JPEG", async () => {
    const decoded = await decodePicture(await pngFile(4000, 1000));

    expect({ width: decoded.width, height: decoded.height }).toEqual({ width: 3840, height: 960 });
    expect(await sizeOf(decoded.display)).toEqual({ width: 3840, height: 960, type: "image/jpeg" });
    expect(await sizeOf(decoded.thumbnail)).toEqual({
      width: 480,
      height: 120,
      type: "image/jpeg",
    });
  });

  it("keeps a small picture at its own size", async () => {
    const decoded = await decodePicture(await pngFile(300, 200));

    expect(await sizeOf(decoded.display)).toEqual({ width: 300, height: 200, type: "image/jpeg" });
    expect(await sizeOf(decoded.thumbnail)).toEqual({
      width: 300,
      height: 200,
      type: "image/jpeg",
    });
  });

  it("rejects a file the browser cannot decode with UnreadablePictureError", async () => {
    const file = new File(["not a picture"], "broken.jpg", { type: "image/jpeg" });

    const error: unknown = await decodePicture(file).catch((rejected: unknown) => rejected);

    expect(error).toBeInstanceOf(UnreadablePictureError);
    expect((error as UnreadablePictureError).fileName).toBe("broken.jpg");
    expect((error as UnreadablePictureError).stage).toBe("decode");
  });
});

describe("decodePicture, picture limits", () => {
  it("rejects a file over the byte limit as too large", async () => {
    const file = await pngFile(300, 200);

    const error = await rejection(decodePicture(file, { ...ROOMY_LIMITS, bytes: file.size - 1 }));

    expect(error.stage).toBe("tooLarge");
    expect(error.fileName).toBe("generated.png");
  });

  it("decodes a file exactly at the byte limit", async () => {
    const file = await pngFile(300, 200);

    const decoded = await decodePicture(file, { ...ROOMY_LIMITS, bytes: file.size });

    expect(decoded.width).toBe(300);
  });

  it("rejects a PNG whose header claims more pixels than the limit as too large", async () => {
    const error = await rejection(
      decodePicture(await pngFile(300, 200), { ...ROOMY_LIMITS, pixels: 300 * 200 - 1 }),
    );

    expect(error.stage).toBe("tooLarge");
  });

  it("decodes a PNG whose header claims exactly the pixel limit", async () => {
    const decoded = await decodePicture(await pngFile(300, 200), {
      ...ROOMY_LIMITS,
      pixels: 300 * 200,
    });

    expect(decoded.height).toBe(200);
  });

  it("rejects a small PNG claiming 20000 x 20000 under the default limits without decoding it", async () => {
    const error = await rejection(decodePicture(pngHeaderClaiming(20_000, 20_000)));

    expect(error.stage).toBe("tooLarge");
  });
});

describe("thumbnailFromImage", () => {
  it("rejects an image over the byte limit as too large", async () => {
    const image = await pngFile(300, 200);

    const error = await rejection(
      thumbnailFromImage(image, { ...ROOMY_LIMITS, bytes: image.size - 1 }),
    );

    expect(error.stage).toBe("tooLarge");
  });

  it("rejects a PNG whose header claims more pixels than the limit as too large", async () => {
    const error = await rejection(
      thumbnailFromImage(await pngFile(300, 200), { ...ROOMY_LIMITS, pixels: 300 * 200 - 1 }),
    );

    expect(error.stage).toBe("tooLarge");
  });

  it("rejects a small PNG claiming 20000 x 20000 under the default limits without decoding it", async () => {
    const error = await rejection(thumbnailFromImage(pngHeaderClaiming(20_000, 20_000)));

    expect(error.stage).toBe("tooLarge");
  });

  it("wraps the failed decode of a garbage blob in UnreadablePictureError", async () => {
    const error = await rejection(thumbnailFromImage(new Blob(["not a picture"])));

    expect(error.stage).toBe("decode");
    expect(error.cause).toBeInstanceOf(DOMException);
  });

  it("downscales an image to the thumbnail bound as JPEG", async () => {
    const thumbnail = await thumbnailFromImage(await pngFile(4000, 1000));

    expect(await sizeOf(thumbnail)).toEqual({ width: 480, height: 120, type: "image/jpeg" });
  });
});
