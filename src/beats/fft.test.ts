import { describe, expect, it } from "vitest";
import { fft } from "./fft";

describe("fft", () => {
  it("puts a cosine's energy into its own frequency bin and its mirror", () => {
    const size = 16;
    const bin = 3;
    const real = Float64Array.from({ length: size }, (_, n) =>
      Math.cos((2 * Math.PI * bin * n) / size),
    );
    const imaginary = new Float64Array(size);

    fft(real, imaginary);

    const magnitudes = Array.from(real, (value, index) => Math.hypot(value, imaginary[index] ?? 0));
    magnitudes.forEach((magnitude, index) =>
      expect(magnitude).toBeCloseTo(index === bin || index === size - bin ? size / 2 : 0, 9),
    );
  });
});
