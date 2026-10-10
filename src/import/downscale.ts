import { UnreadablePictureError } from "./unreadable-picture";

/** Imported pictures are stored downscaled: a slideshow never needs more than display resolution. */

export interface Size {
  readonly width: number;
  readonly height: number;
}

/** The largest size a rendition may have, by its long and its short edge. */
export interface Bound {
  readonly longEdge: number;
  readonly shortEdge: number;
}

/** About 4K, in either orientation. */
export const DISPLAY_BOUND: Bound = { longEdge: 3840, shortEdge: 2160 };
export const THUMBNAIL_BOUND: Bound = { longEdge: 480, shortEdge: 480 };
const DISPLAY_JPEG_QUALITY = 0.9;
const THUMBNAIL_JPEG_QUALITY = 0.8;
const STORED_PICTURE_TYPE = "image/jpeg";

/** A picture as stored, with the size of its display rendition. */
export interface DecodedPicture extends Size {
  readonly display: Blob;
  readonly thumbnail: Blob;
}

/** Scales `size` down, keeping its aspect ratio, until it fits `bound`; never scales up. */
export function fitWithin(size: Size, bound: Bound): Size {
  const longEdge = Math.max(size.width, size.height);
  const shortEdge = Math.min(size.width, size.height);
  const scale = Math.min(1, bound.longEdge / longEdge, bound.shortEdge / shortEdge);
  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  };
}

/** Decodes a picture file, upright per its EXIF orientation, into its two stored renditions. */
export async function decodePicture(file: File): Promise<DecodedPicture> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch (error) {
    throw new UnreadablePictureError(file.name, { cause: error });
  }
  try {
    const display = fitWithin(bitmap, DISPLAY_BOUND);
    return {
      ...display,
      display: await encodeJpeg(bitmap, display, DISPLAY_JPEG_QUALITY),
      thumbnail: await encodeJpeg(
        bitmap,
        fitWithin(bitmap, THUMBNAIL_BOUND),
        THUMBNAIL_JPEG_QUALITY,
      ),
    };
  } finally {
    bitmap.close();
  }
}

/** Draws `bitmap` scaled to `size` and encodes it as JPEG; also used by the web page export. */
export async function encodeJpeg(bitmap: ImageBitmap, size: Size, quality: number): Promise<Blob> {
  if (typeof OffscreenCanvas === "function") {
    const canvas = new OffscreenCanvas(size.width, size.height);
    drawScaled(canvas.getContext("2d"), bitmap, size);
    return canvas.convertToBlob({ type: STORED_PICTURE_TYPE, quality });
  }
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  drawScaled(canvas.getContext("2d"), bitmap, size);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, STORED_PICTURE_TYPE, quality),
  );
  if (blob === null) {
    throw new Error(`the canvas could not encode a ${size.width}×${size.height} JPEG`);
  }
  return blob;
}

function drawScaled(
  context: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null,
  bitmap: ImageBitmap,
  size: Size,
): void {
  if (context === null) {
    throw new Error("this browser offers no 2D canvas to downscale pictures with");
  }
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, size.width, size.height);
}
