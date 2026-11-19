import { afterEach, describe, expect, it, vi } from "vitest";
import { pixelsOf } from "./bitmap-pixels";

const SIZE = { width: 4, height: 3 };

afterEach(() => vi.restoreAllMocks());

describe("pixelsOf", () => {
  it("reads the pixels through a CPU-backed canvas, so the readback never stalls the GPU", async () => {
    const getContext = vi.spyOn(OffscreenCanvas.prototype, "getContext");
    const bitmap = await createImageBitmap(new ImageData(SIZE.width, SIZE.height));

    const picture = pixelsOf(bitmap);

    expect(picture.data.length, "the picture's RGBA bytes").toBe(SIZE.width * SIZE.height * 4);
    expect(getContext).toHaveBeenCalledWith("2d", { willReadFrequently: true });
  });
});
