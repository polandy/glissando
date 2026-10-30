import { describe, expect, it } from "vitest";
import { lookUniformValues } from "./look-uniforms";

/** Round-trips through Float32Array, so comparisons match the precision the uniform actually gets. */
function float32(values: readonly number[]): number[] {
  return Array.from(new Float32Array(values));
}

describe("lookUniformValues: none", () => {
  it("is off, so the matrix/offset/curve are never read by the shader", () => {
    expect(lookUniformValues("none").on).toBe(false);
  });
});

describe("lookUniformValues: a graded look", () => {
  it("is on", () => {
    expect(lookUniformValues("warm").on).toBe(true);
  });

  it("transposes the row-major matrix into mat3's column-major layout", () => {
    // warm's rows (LOOKS.md): [1.08, 0.02, 0], [0.01, 1.01, 0], [0, 0, 0.86].
    const { matrix } = lookUniformValues("warm");
    expect(Array.from(matrix)).toEqual(float32([1.08, 0.01, 0, 0.02, 1.01, 0, 0, 0, 0.86]));
  });

  it("carries the offset unchanged", () => {
    expect(lookUniformValues("warm").offset).toEqual([0.015, 0.008, 0]);
  });

  it("interleaves each channel's 5 knots into one vec3 per knot", () => {
    // warm's curves (LOOKS.md): r 0 .27 .53 .78 1, g 0 .25 .51 .76 .98, b 0 .23 .47 .72 .94.
    const { curve } = lookUniformValues("warm");
    expect(Array.from(curve)).toEqual(
      float32([0, 0, 0, 0.27, 0.25, 0.23, 0.53, 0.51, 0.47, 0.78, 0.76, 0.72, 1, 0.98, 0.94]),
    );
  });
});
