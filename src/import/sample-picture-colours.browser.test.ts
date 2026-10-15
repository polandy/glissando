import { describe, expect, it } from "vitest";
import { pictureColours } from "../library/picture-colours";
import { samplePictureColourPixels } from "./sample-picture-colours";
import { UnreadablePictureError } from "./unreadable-picture";

async function solidColourPng(width: number, height: number, colour: string): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("this browser has no 2D canvas");
  }
  context.fillStyle = colour;
  context.fillRect(0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (blob === null) {
    throw new Error("the canvas did not encode a PNG");
  }
  return blob;
}

describe("samplePictureColourPixels", () => {
  it("reads a large picture's pixels downscaled to at most 64 pixels per edge", async () => {
    const pixels = await samplePictureColourPixels(await solidColourPng(400, 200, "#2050c0"));

    expect(pixels.length).toBeLessThanOrEqual(64 * 64);
    expect(pixels.length).toBeGreaterThan(0);
    for (const pixel of pixels) {
      expect(pixel).toEqual({ r: 0x20, g: 0x50, b: 0xc0 });
    }
  });

  it("feeds pictureColours pixels that reflect the picture's own colour", async () => {
    const pixels = await samplePictureColourPixels(await solidColourPng(40, 40, "#2050c0"));

    const { veil } = pictureColours(pixels);

    expect(veil.slice(1, 3) < veil.slice(5, 7)).toBe(true); // a blue veil: less red than blue
  });

  it("rejects a blob the browser cannot decode with UnreadablePictureError", async () => {
    const blob = new Blob(["not a picture"], { type: "image/png" });

    const error: unknown = await samplePictureColourPixels(blob).catch(
      (rejected: unknown) => rejected,
    );

    expect(error).toBeInstanceOf(UnreadablePictureError);
  });
});
