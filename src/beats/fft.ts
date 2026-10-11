/**
 * An in-place radix-2 fast Fourier transform: `real` and `imaginary` hold the signal on entry and
 * its spectrum on return. Their length must be a power of two.
 */
export function fft(real: Float64Array, imaginary: Float64Array): void {
  const size = real.length;
  reorderByReversedBits(real, imaginary);
  for (let length = 2; length <= size; length *= 2) {
    const half = length / 2;
    const angle = (-2 * Math.PI) / length;
    const stepReal = Math.cos(angle);
    const stepImaginary = Math.sin(angle);
    for (let start = 0; start < size; start += length) {
      let twiddleReal = 1;
      let twiddleImaginary = 0;
      for (let offset = 0; offset < half; offset += 1) {
        const a = start + offset;
        const b = a + half;
        const bReal = at(real, b);
        const bImaginary = at(imaginary, b);
        const productReal = bReal * twiddleReal - bImaginary * twiddleImaginary;
        const productImaginary = bReal * twiddleImaginary + bImaginary * twiddleReal;
        real[b] = at(real, a) - productReal;
        imaginary[b] = at(imaginary, a) - productImaginary;
        real[a] = at(real, a) + productReal;
        imaginary[a] = at(imaginary, a) + productImaginary;
        const nextReal = twiddleReal * stepReal - twiddleImaginary * stepImaginary;
        twiddleImaginary = twiddleReal * stepImaginary + twiddleImaginary * stepReal;
        twiddleReal = nextReal;
      }
    }
  }
}

function reorderByReversedBits(real: Float64Array, imaginary: Float64Array): void {
  const size = real.length;
  for (let index = 1, reversed = 0; index < size; index += 1) {
    let bit = size >> 1;
    for (; reversed & bit; bit >>= 1) {
      reversed ^= bit;
    }
    reversed ^= bit;
    if (index < reversed) {
      swap(real, index, reversed);
      swap(imaginary, index, reversed);
    }
  }
}

function swap(values: Float64Array, a: number, b: number): void {
  const kept = at(values, a);
  values[a] = at(values, b);
  values[b] = kept;
}

/** The value at an index the caller keeps in range. */
function at(values: Float64Array, index: number): number {
  return values[index] as number;
}
