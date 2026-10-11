import type { GreyImage } from "../../focus/grey-image";

/** Generated grey pictures for the measurement's unit tests; no photo is involved. */

export function greyImage(
  width: number,
  height: number,
  shade: (x: number, y: number) => number,
): GreyImage {
  const pixels = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) pixels[y * width + x] = shade(x, y);
  }
  return { width, height, pixels };
}

/** Squares of `cell` pixels in black and white, shifted right by `shift` pixels. */
export function checkerboard(width: number, height: number, cell: number, shift = 0): GreyImage {
  return greyImage(width, height, (x, y) =>
    (Math.floor((x + shift) / cell) + Math.floor(y / cell)) % 2 === 0 ? 0 : 255,
  );
}

/** A soft left-to-right ramp with a few bars: a scene unlike the checkerboard. */
export function bars(width: number, height: number): GreyImage {
  return greyImage(width, height, (x, y) =>
    Math.floor(x / 20) % 3 === 0
      ? 255 - Math.floor((y / height) * 255)
      : Math.floor((x / width) * 255),
  );
}

/** `image` box-blurred `passes` times with a 3 × 3 kernel; edges keep their pixels. */
export function blurred(image: GreyImage, passes: number): GreyImage {
  let pixels = image.pixels;
  const { width, height } = image;
  for (let pass = 0; pass < passes; pass++) {
    const next = Uint8Array.from(pixels);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) sum += pixels[(y + dy) * width + x + dx] ?? 0;
        }
        next[y * width + x] = Math.round(sum / 9);
      }
    }
    pixels = next;
  }
  return { width, height, pixels };
}
