import type { GreyImage } from "../focus/grey-image";

/**
 * How sharp a picture is: the variance of its 4-neighbour Laplacian over the inner pixels. Edges
 * give the Laplacian large values of both signs; blur flattens them, so the variance falls.
 */
export function sharpness({ width, height, pixels }: GreyImage): number {
  let count = 0;
  let sum = 0;
  let sumOfSquares = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const at = y * width + x;
      const laplacian =
        (pixels[at - 1] ?? 0) +
        (pixels[at + 1] ?? 0) +
        (pixels[at - width] ?? 0) +
        (pixels[at + width] ?? 0) -
        4 * (pixels[at] ?? 0);
      count += 1;
      sum += laplacian;
      sumOfSquares += laplacian * laplacian;
    }
  }
  if (count === 0) return 0;
  const mean = sum / count;
  return sumOfSquares / count - mean * mean;
}
