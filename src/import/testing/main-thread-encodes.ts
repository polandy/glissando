/** A camera's original, larger than the display bound: its display rendition is 3240×2160. */
export const ORIGINAL_SIZE = { width: 4800, height: 3200 } as const;
export const ORIGINAL_RENDITION_SIZE = { width: 3240, height: 2160 } as const;

/** A flat JPEG of `size`, drawn on a canvas, as a camera would store it. */
export async function jpegFile(
  name: string,
  size: { readonly width: number; readonly height: number },
): Promise<File> {
  const canvas = new OffscreenCanvas(size.width, size.height);
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("no 2D canvas context to draw a test picture");
  context.fillStyle = "rgb(255 0 0)";
  context.fillRect(0, 0, size.width, size.height);
  const blob = await canvas.convertToBlob({ type: "image/jpeg" });
  return new File([blob], name, { type: "image/jpeg" });
}

/** Counts the JPEG encodes run on this, the main, thread until restored. */
export function countMainThreadEncodes(): { count(): number; restore(): void } {
  let count = 0;
  const convertToBlob = OffscreenCanvas.prototype.convertToBlob;
  const toBlob = HTMLCanvasElement.prototype.toBlob;
  OffscreenCanvas.prototype.convertToBlob = function (...args) {
    count += 1;
    return convertToBlob.apply(this, args);
  };
  HTMLCanvasElement.prototype.toBlob = function (...args) {
    count += 1;
    toBlob.apply(this, args);
  };
  return {
    count: () => count,
    restore() {
      OffscreenCanvas.prototype.convertToBlob = convertToBlob;
      HTMLCanvasElement.prototype.toBlob = toBlob;
    },
  };
}
