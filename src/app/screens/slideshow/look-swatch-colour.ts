import { DEFAULT_SLIDESHOW_LOOK, gradeColour, type SlideshowLook } from "../../../player";

/** A neutral mid-grey: not any one picture's own colour, so every look grades the same input. */
const REFERENCE_GREY: readonly [number, number, number] = [0.5, 0.5, 0.5];

function channel(unit: number): number {
  return Math.round(unit * 255);
}

/**
 * The Look tile's small swatch colour (ADR-0048): the look's own grade (`gradeColour`, the same
 * maths the player renders with) applied to a neutral reference grey, as a CSS `rgb()` string.
 * Null for "none", which has no grade and so nothing honest to show.
 */
export function lookSwatchColour(look: SlideshowLook): string | null {
  if (look === DEFAULT_SLIDESHOW_LOOK) {
    return null;
  }
  const [r, g, b] = gradeColour(look, REFERENCE_GREY);
  return `rgb(${channel(r)} ${channel(g)} ${channel(b)})`;
}
