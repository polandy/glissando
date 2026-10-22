import { LOOK_GRADES, type LookGrade } from "../looks/look-grades";
import { DEFAULT_SLIDESHOW_LOOK, type SlideshowLook } from "../looks/slideshow-look";

/** A look's grade as the shader's uniforms want it (ADR-0044): see `look-glsl.ts`. */
export interface LookUniformValues {
  /** Whether the shader should grade at all; off for `"none"`, where the other fields are unused. */
  readonly on: boolean;
  /** `lookMatrix`: a WebGL mat3, column-major, `transpose: false` (`gl.uniformMatrix3fv`). */
  readonly matrix: Float32Array;
  readonly offset: readonly [number, number, number];
  /** `lookCurve[5]`: 5 knots, each 3 floats (r, g, b), in knot order (`gl.uniform3fv`). */
  readonly curve: Float32Array;
}

const IDENTITY: LookUniformValues = {
  on: false,
  matrix: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
  offset: [0, 0, 0],
  curve: new Float32Array(15),
};

/** The shader's grading uniforms for `look`, `"none"` carrying `lookOn: 0` (ADR-0044). */
export function lookUniformValues(look: SlideshowLook): LookUniformValues {
  if (look === DEFAULT_SLIDESHOW_LOOK) {
    return IDENTITY;
  }
  const grade = LOOK_GRADES[look];
  return {
    on: true,
    matrix: columnMajorMatrix(grade.matrix),
    offset: grade.offset,
    curve: flattenCurve(grade.curve),
  };
}

/** GLSL's `mat3 * vec3` reads columns, so the row-major matrix (LOOKS.md) is transposed here. */
function columnMajorMatrix(matrix: LookGrade["matrix"]): Float32Array {
  const [[r0, r1, r2], [g0, g1, g2], [b0, b1, b2]] = matrix;
  return new Float32Array([r0, g0, b0, r1, g1, b1, r2, g2, b2]);
}

/** `curve.r/g/b`'s 5 knots each, interleaved into `lookCurve[knot] = vec3(r, g, b)`. */
function flattenCurve(curve: LookGrade["curve"]): Float32Array {
  const [r0, r1, r2, r3, r4] = curve.r;
  const [g0, g1, g2, g3, g4] = curve.g;
  const [b0, b1, b2, b3, b4] = curve.b;
  return new Float32Array([r0, g0, b0, r1, g1, b1, r2, g2, b2, r3, g3, b3, r4, g4, b4]);
}
