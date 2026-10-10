import { encodeJpeg } from "../../import/downscale";
import type { PictureScaler } from "../ports";

/** Scales with the browser's own decoder and a 2D canvas, as the import does. */
export const canvasPictureScaler: PictureScaler = {
  async scale(picture, size, quality) {
    const bitmap = await createImageBitmap(picture, { imageOrientation: "from-image" });
    try {
      return await encodeJpeg(bitmap, size, quality);
    } finally {
      bitmap.close();
    }
  },
};
