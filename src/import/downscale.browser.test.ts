import { describe, expect, it } from "vitest";
import { decodePicture, UnreadablePictureError } from "./downscale";

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
  });
});
