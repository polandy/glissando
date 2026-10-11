import type { GreyImage } from "../focus/grey-image";

/** The hash compares neighbouring cells of a 9 × 8 grid, giving 8 × 8 = 64 bits. */
const HASH_COLUMNS = 9;
const HASH_ROWS = 8;

/**
 * A 64-bit difference hash: the picture averaged down to 9 × 8 cells, one bit per pair of
 * horizontal neighbours, set where the left one is brighter. Pictures of the same scene, a little
 * shifted or blurred, differ in few bits.
 */
export function differenceHash(image: GreyImage): bigint {
  const cells = cellMeans(image);
  let hash = 0n;
  for (let row = 0; row < HASH_ROWS; row++) {
    for (let column = 0; column < HASH_COLUMNS - 1; column++) {
      const left = cells[row * HASH_COLUMNS + column] ?? 0;
      const right = cells[row * HASH_COLUMNS + column + 1] ?? 0;
      hash = (hash << 1n) | (left > right ? 1n : 0n);
    }
  }
  return hash;
}

/** The number of bits two hashes differ in. */
export function hashDistance(first: bigint, second: bigint): number {
  let differing = first ^ second;
  let count = 0;
  while (differing !== 0n) {
    differing &= differing - 1n;
    count += 1;
  }
  return count;
}

/** The mean brightness of each cell of the grid, row by row; every pixel counts for one cell. */
function cellMeans({ width, height, pixels }: GreyImage): Float64Array {
  const sums = new Float64Array(HASH_COLUMNS * HASH_ROWS);
  const counts = new Float64Array(HASH_COLUMNS * HASH_ROWS);
  for (let y = 0; y < height; y++) {
    const row = Math.floor((y * HASH_ROWS) / height);
    for (let x = 0; x < width; x++) {
      const cell = row * HASH_COLUMNS + Math.floor((x * HASH_COLUMNS) / width);
      sums[cell] = (sums[cell] ?? 0) + (pixels[y * width + x] ?? 0);
      counts[cell] = (counts[cell] ?? 0) + 1;
    }
  }
  return sums.map((sum, cell) => (counts[cell] ? sum / (counts[cell] ?? 1) : 0));
}
