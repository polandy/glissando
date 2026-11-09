import type { PixelPicture } from "./pixel-loader";

/**
 * `bitmap`'s RGBA bytes, read from a canvas it is drawn on; `bitmap` is closed. The canvas copy
 * also keeps WebKit from handing concurrent decodes of equally sized pictures each other's bitmaps.
 */
export function pixelsOf(bitmap: ImageBitmap): PixelPicture {
  const { width, height } = bitmap;
  const context = new OffscreenCanvas(width, height).getContext("2d");
  if (context === null) {
    throw new Error("no 2D canvas context to read a decoded picture's pixels");
  }
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  return { width, height, data: context.getImageData(0, 0, width, height).data };
}
