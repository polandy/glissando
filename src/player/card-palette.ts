import type { CardInk } from "./slideshow";

/**
 * The card's colour swatches: a ground or veil tint by id, to hex (ADR-0032,
 * `dev-docs/player/TITLE_CARDS.md` § Look). The composer picks a swatch; the player only draws
 * the hex it is given.
 */
export const CARD_SWATCHES = {
  plum: "#2A2340",
  night: "#14111C",
  cream: "#FFF3E2",
  peach: "#FFB59A",
  mint: "#8FD9C4",
  lemon: "#FFD95A",
} as const satisfies Record<string, string>;

export type CardSwatchId = keyof typeof CARD_SWATCHES;

/** The tint the composer falls back to until picture-derived tints land (TITLE_CARDS.md). */
export const CARD_DEFAULT_TINT: string = CARD_SWATCHES.plum;

/** sRGB 0..255 to linear, for relative luminance (WCAG). */
function linear(channel: number): number {
  const fraction = channel / 255;
  return fraction <= 0.03928 ? fraction / 12.92 : ((fraction + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance (0 black .. 1 white) of a `#RRGGBB` colour. */
function relativeLuminance(hex: string): number {
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
}

/** `"dark"` ink reads on a `hex` ground above the midpoint; `"light"` ink reads below it. */
export function inkFor(hex: string): CardInk {
  return relativeLuminance(hex) > 0.5 ? "dark" : "light";
}
