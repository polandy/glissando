import type { Rgb } from "./grade-colour";
import type { GradedSlideshowLook } from "./slideshow-look";

/** Five knots of a channel's tone curve, at 0, ¼, ½, ¾, 1 (LOOKS.md § The grade). */
export type CurveKnots = readonly [number, number, number, number, number];

/** A look's grade: the matrix step then the tone curve (LOOKS.md § The grade). */
export interface LookGrade {
  /** 3×3, by rows. */
  readonly matrix: readonly [Rgb, Rgb, Rgb];
  readonly offset: Rgb;
  readonly curve: { readonly r: CurveKnots; readonly g: CurveKnots; readonly b: CurveKnots };
}

/** Rec. 709 luma weights (LOOKS.md § The grade): `S(s)` and black-and-white are built from them. */
const REC_709_LUMA: Rgb = [0.2126, 0.7152, 0.0722];

const ZERO_OFFSET: Rgb = [0, 0, 0];

/** The saturation matrix `S(s)`: row _i_ is `(1 − s) · L + s · eᵢ` (LOOKS.md § The grade). */
function saturationMatrix(s: number): readonly [Rgb, Rgb, Rgb] {
  const [lr, lg, lb] = REC_709_LUMA;
  return [
    [(1 - s) * lr + s, (1 - s) * lg, (1 - s) * lb],
    [(1 - s) * lr, (1 - s) * lg + s, (1 - s) * lb],
    [(1 - s) * lr, (1 - s) * lg, (1 - s) * lb + s],
  ];
}

/** Every row is the luma weights: any colour of the same luma grades to the same grey. */
const BLACK_AND_WHITE_MATRIX: readonly [Rgb, Rgb, Rgb] = [REC_709_LUMA, REC_709_LUMA, REC_709_LUMA];

/** Every look's grade, transcribed from `dev-docs/player/LOOKS.md`'s table ("none" excepted —
 * it is the identity and carries no entry). */
export const LOOK_GRADES: Readonly<Record<GradedSlideshowLook, LookGrade>> = {
  warm: {
    matrix: [
      [1.08, 0.02, 0],
      [0.01, 1.01, 0],
      [0, 0, 0.86],
    ],
    offset: [0.015, 0.008, 0],
    curve: {
      r: [0, 0.27, 0.53, 0.78, 1],
      g: [0, 0.25, 0.51, 0.76, 0.98],
      b: [0, 0.23, 0.47, 0.72, 0.94],
    },
  },
  cool: {
    matrix: [
      [0.9, 0, 0],
      [0, 1, 0.02],
      [0, 0.03, 1.1],
    ],
    offset: [0, 0.01, 0.03],
    curve: {
      r: [0, 0.24, 0.49, 0.74, 0.95],
      g: [0, 0.25, 0.51, 0.76, 0.98],
      b: [0.02, 0.28, 0.53, 0.78, 1],
    },
  },
  vivid: {
    matrix: saturationMatrix(1.35),
    offset: ZERO_OFFSET,
    curve: {
      r: [0, 0.2, 0.5, 0.82, 1],
      g: [0, 0.2, 0.5, 0.82, 1],
      b: [0, 0.2, 0.5, 0.82, 1],
    },
  },
  film: {
    matrix: saturationMatrix(0.82),
    offset: ZERO_OFFSET,
    curve: {
      r: [0.05, 0.2, 0.5, 0.82, 0.97],
      g: [0.05, 0.21, 0.49, 0.79, 0.94],
      b: [0.1, 0.25, 0.48, 0.73, 0.88],
    },
  },
  "black-and-white": {
    matrix: BLACK_AND_WHITE_MATRIX,
    offset: ZERO_OFFSET,
    curve: {
      r: [0.02, 0.18, 0.5, 0.84, 1],
      g: [0.02, 0.18, 0.5, 0.84, 1],
      b: [0.02, 0.18, 0.5, 0.84, 1],
    },
  },
  faded: {
    matrix: saturationMatrix(0.7),
    offset: ZERO_OFFSET,
    curve: {
      r: [0.14, 0.36, 0.58, 0.79, 0.94],
      g: [0.13, 0.35, 0.57, 0.78, 0.93],
      b: [0.15, 0.36, 0.57, 0.77, 0.91],
    },
  },
};
