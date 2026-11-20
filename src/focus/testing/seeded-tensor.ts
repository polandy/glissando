import type { Tensor } from "../onnx/tensor-ops";

/** A tensor of floats in `[low, high)` from a fixed seed, the same on every run (mulberry32). */
export function seededTensor(
  dims: readonly number[],
  seed: number,
  [low, high]: readonly [number, number],
): Tensor {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 2 ** 32;
  };
  const size = dims.reduce((total, dim) => total * dim, 1);
  return { dims, data: Float32Array.from({ length: size }, () => low + (high - low) * next()) };
}

/** The largest absolute difference between two same-length float arrays. */
export function largestDifference(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) throw new RangeError(`Lengths ${a.length} and ${b.length} differ`);
  return a.reduce(
    (largest, value, index) => Math.max(largest, Math.abs(value - (b[index] ?? 0))),
    0,
  );
}
