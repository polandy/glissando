import type { Rgb } from "./grade-colour";
import { LOOK_GRADES } from "./look-grades";
import { DEFAULT_SLIDESHOW_LOOK, type SlideshowLook } from "./slideshow-look";

/** Decimal places for the SVG filter's attribute strings; a computed look's saturation matrix
 * carries float noise that would otherwise show up verbatim in the DOM. */
const FILTER_DECIMAL_PLACES = 6;

/** The attribute strings an SVG `<filter>` needs to grade a look (LOOKS.md § The grade): this is
 * exactly `feColorMatrix` (`type="matrix"`) followed by `feComponentTransfer` (`type="table"`). */
export interface LookFilterValues {
  /** `feColorMatrix`'s `values`: 4 rows × 5 columns, row-major, offsets in the fifth column. */
  readonly colorMatrixValues: string;
  readonly tableValues: { readonly r: string; readonly g: string; readonly b: string };
}

/** `lookFilterValues(look)` is null for "none" — the DOM fallback applies no filter then. */
export function lookFilterValues(look: SlideshowLook): LookFilterValues | null {
  if (look === DEFAULT_SLIDESHOW_LOOK) {
    return null;
  }
  const grade = LOOK_GRADES[look];
  const [row0, row1, row2] = grade.matrix;
  const [o0, o1, o2] = grade.offset;
  const colorMatrixRow = (row: Rgb, offset: number): readonly number[] => [...row, 0, offset];
  const colorMatrixValues = [
    colorMatrixRow(row0, o0),
    colorMatrixRow(row1, o1),
    colorMatrixRow(row2, o2),
    [0, 0, 0, 1, 0],
  ]
    .flat()
    .map(format)
    .join(" ");
  return {
    colorMatrixValues,
    tableValues: {
      r: grade.curve.r.map(format).join(" "),
      g: grade.curve.g.map(format).join(" "),
      b: grade.curve.b.map(format).join(" "),
    },
  };
}

/** `value` rounded to `FILTER_DECIMAL_PLACES` and printed without trailing zeros. */
function format(value: number): string {
  return String(Number(value.toFixed(FILTER_DECIMAL_PLACES)));
}
