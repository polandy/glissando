import type { BitmapPicture } from "../browser/bitmap-loader";
import { blurBackdrop } from "../backdrop-blur";

/**
 * The long side, in pixels, of the small copy a blurred fill's backdrop is made from: small
 * enough to blur on the CPU in a fraction of a frame, and the blur hides its coarseness.
 */
export const BACKDROP_LONG_SIDE = 96;

/**
 * The picture shrunk to `BACKDROP_LONG_SIDE`, blurred once (`blurBackdrop`) and uploaded as a
 * small texture, smoothly magnified (LINEAR) and without mipmaps (ADR-0028). The backdrop never
 * moves on its own, so blurring it once replaces any blur per pixel and frame.
 */
export function createBackdropTexture(
  gl: WebGL2RenderingContext,
  picture: BitmapPicture,
): WebGLTexture {
  const scale = BACKDROP_LONG_SIDE / Math.max(picture.width, picture.height);
  const width = Math.max(1, Math.round(picture.width * scale));
  const height = Math.max(1, Math.round(picture.height * scale));
  const blurred = blurBackdrop({ width, height, data: shrunkPixels(picture, width, height) });
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA8,
    width,
    height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    blurred.data,
  );
  return texture;
}

function shrunkPixels({ bitmap }: BitmapPicture, width: number, height: number): Uint8ClampedArray {
  const context = new OffscreenCanvas(width, height).getContext("2d");
  if (context === null) {
    throw new Error("this browser offers no 2D canvas to shrink a picture's backdrop with");
  }
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  return context.getImageData(0, 0, width, height).data;
}
