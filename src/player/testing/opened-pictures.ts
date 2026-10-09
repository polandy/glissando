import type { Slideshow } from "../slideshow";

export const PICTURE_SIZE = 16;
/** The media id slides refer to their picture by, resolved through `openPicture`. */
export const PICTURE_ID = "picture-1";

/** A red PNG of `PICTURE_SIZE` square, as stored media would hold it. */
export async function redPng(): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = PICTURE_SIZE;
  canvas.height = PICTURE_SIZE;
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("no 2D canvas context to draw a test picture");
  }
  context.fillStyle = "rgb(255 0 0)";
  context.fillRect(0, 0, PICTURE_SIZE, PICTURE_SIZE);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob === null ? reject(new Error("no PNG")) : resolve(blob))),
  );
}

/** An `openPicture` that knows only `id`. */
export function openingOnly(id: string, blob: Blob): (src: string) => Promise<Blob> {
  return (src) =>
    src === id ? Promise.resolve(blob) : Promise.reject(new Error(`unknown picture "${src}"`));
}

/** A one-slide slideshow whose picture `src` is the media id `PICTURE_ID`. */
export const OPENED_PICTURE_SHOW: Slideshow = {
  formatVersion: 2,
  title: "July 2025",
  slides: [
    {
      image: { src: PICTURE_ID, capturedAt: "2025-07-01T10:00:00Z" },
      durationMs: 5000,
      kenBurns: {
        from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
        to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
        easing: "linear",
      },
    },
  ],
};
