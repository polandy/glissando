import { LOOK_GRADES, type CurveKnots, type LookGrade } from "./look-grades";
import { DEFAULT_SLIDESHOW_LOOK, type SlideshowLook } from "./slideshow-look";

/** An sRGB colour, each channel 0..1. */
export type Rgb = readonly [number, number, number];

const UNIT_MIN = 0;
const UNIT_MAX = 1;

function clampUnit(value: number): number {
  return Math.min(UNIT_MAX, Math.max(UNIT_MIN, value));
}

/** The matrix step: `clamp(M · rgb + offset, 0, 1)`, `M` 3×3 by rows (LOOKS.md § The grade). */
function gradeMatrix(grade: LookGrade, [r, g, b]: Rgb): Rgb {
  const [row0, row1, row2] = grade.matrix;
  const [o0, o1, o2] = grade.offset;
  const apply = (row: Rgb, offset: number): number =>
    clampUnit(row[0] * r + row[1] * g + row[2] * b + offset);
  return [apply(row0, o0), apply(row1, o1), apply(row2, o2)];
}

/** Four quarter-wide segments between the curve's five knots. */
const CURVE_SEGMENTS = 4;
const LAST_SEGMENT = 3;

/** One channel's tone curve at `c` (LOOKS.md § The grade, step 2): linear between its knots. */
function curveValue([v0, v1, v2, v3, v4]: CurveKnots, c: number): number {
  const position = c * CURVE_SEGMENTS;
  const segment = Math.min(Math.floor(position), LAST_SEGMENT);
  const t = position - segment;
  switch (segment) {
    case 0:
      return v0 + t * (v1 - v0);
    case 1:
      return v1 + t * (v2 - v1);
    case 2:
      return v2 + t * (v3 - v2);
    default:
      return v3 + t * (v4 - v3);
  }
}

/**
 * `rgb` graded by `look` (ADR-0044, `dev-docs/player/LOOKS.md`): the matrix step then the tone
 * curve, per channel. The identity for "none". The reference the shader and the DOM fallback's
 * SVG filter are tested against.
 */
export function gradeColour(look: SlideshowLook, rgb: Rgb): Rgb {
  if (look === DEFAULT_SLIDESHOW_LOOK) {
    return rgb;
  }
  const grade = LOOK_GRADES[look];
  const [mr, mg, mb] = gradeMatrix(grade, rgb);
  return [
    curveValue(grade.curve.r, mr),
    curveValue(grade.curve.g, mg),
    curveValue(grade.curve.b, mb),
  ];
}
