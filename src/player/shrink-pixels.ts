import type { RgbaPixels } from "./backdrop-blur";

const CHANNELS = 4;
/** Samples along each axis of a target pixel's cell: enough that fine detail averages out. */
const SAMPLES_PER_AXIS = 4;

/**
 * `source` shrunk to `width` x `height`, each pixel the average of a grid of samples spread over
 * the source cell it covers: cheap for a 4K picture, and smooth enough for a blurred backdrop.
 */
export function shrinkPixels(source: RgbaPixels, width: number, height: number): RgbaPixels {
  const data = new Uint8ClampedArray(width * height * CHANNELS);
  const cellWidth = source.width / width;
  const cellHeight = source.height / height;
  const sums = new Float64Array(CHANNELS);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      sums.fill(0);
      for (let row = 0; row < SAMPLES_PER_AXIS; row += 1) {
        const sourceY = Math.floor((y + (row + 0.5) / SAMPLES_PER_AXIS) * cellHeight);
        for (let column = 0; column < SAMPLES_PER_AXIS; column += 1) {
          const sourceX = Math.floor((x + (column + 0.5) / SAMPLES_PER_AXIS) * cellWidth);
          const offset = (sourceY * source.width + sourceX) * CHANNELS;
          for (let channel = 0; channel < CHANNELS; channel += 1) {
            sums[channel] = (sums[channel] ?? 0) + (source.data[offset + channel] ?? 0);
          }
        }
      }
      const samples = SAMPLES_PER_AXIS * SAMPLES_PER_AXIS;
      const target = (y * width + x) * CHANNELS;
      for (let channel = 0; channel < CHANNELS; channel += 1) {
        data[target + channel] = Math.round((sums[channel] ?? 0) / samples);
      }
    }
  }
  return { width, height, data };
}
