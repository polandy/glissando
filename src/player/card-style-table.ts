import type { CardInk, CardStyle } from "./slideshow";

/**
 * The title card's four styles and two inks (ADR-0032, `dev-docs/player/TITLE_CARDS.md` §
 * Look): pure data, split out of `card-layout.ts` to keep that file under the line limit.
 */

const FONT_FAMILIES = {
  bricolage: '"Bricolage Grotesque", sans-serif',
  instrumentSans: '"Instrument Sans", sans-serif',
  geistMono: '"Geist Mono", monospace',
  instrumentSerif: '"Instrument Serif", serif',
} as const;

/** A style's title or subtitle, as fractions of the stage height `h`. */
export interface CardTextSpec {
  readonly fontFamily: string;
  readonly fontWeight: number;
  readonly italic: boolean;
  readonly uppercase: boolean;
  readonly sizeFractionOfHeight: number;
  readonly trackingEm: number;
  readonly lineHeightEm: number;
}

/** The line height a style does not call out as its own. */
const CARD_DEFAULT_LINE_HEIGHT_EM = 1.1;

export const CARD_STYLE_SPECS: Readonly<
  Record<CardStyle, { title: CardTextSpec; subtitle: CardTextSpec }>
> = {
  modern: {
    title: {
      fontFamily: FONT_FAMILIES.bricolage,
      fontWeight: 700,
      italic: false,
      uppercase: false,
      sizeFractionOfHeight: 0.11,
      trackingEm: -0.01,
      lineHeightEm: CARD_DEFAULT_LINE_HEIGHT_EM,
    },
    subtitle: {
      fontFamily: FONT_FAMILIES.instrumentSans,
      fontWeight: 500,
      italic: false,
      uppercase: false,
      sizeFractionOfHeight: 0.05,
      trackingEm: 0,
      lineHeightEm: CARD_DEFAULT_LINE_HEIGHT_EM,
    },
  },
  quiet: {
    title: {
      fontFamily: FONT_FAMILIES.instrumentSans,
      fontWeight: 400,
      italic: false,
      uppercase: true,
      sizeFractionOfHeight: 0.065,
      trackingEm: 0.18,
      lineHeightEm: CARD_DEFAULT_LINE_HEIGHT_EM,
    },
    subtitle: {
      fontFamily: FONT_FAMILIES.instrumentSans,
      fontWeight: 400,
      italic: false,
      uppercase: false,
      sizeFractionOfHeight: 0.032,
      trackingEm: 0,
      lineHeightEm: CARD_DEFAULT_LINE_HEIGHT_EM,
    },
  },
  bold: {
    title: {
      fontFamily: FONT_FAMILIES.bricolage,
      fontWeight: 700,
      italic: false,
      uppercase: false,
      sizeFractionOfHeight: 0.16,
      trackingEm: 0,
      lineHeightEm: 0.95,
    },
    subtitle: {
      fontFamily: FONT_FAMILIES.geistMono,
      fontWeight: 500,
      italic: false,
      uppercase: false,
      sizeFractionOfHeight: 0.065,
      trackingEm: 0,
      lineHeightEm: CARD_DEFAULT_LINE_HEIGHT_EM,
    },
  },
  classic: {
    title: {
      fontFamily: FONT_FAMILIES.instrumentSerif,
      fontWeight: 400,
      italic: false,
      uppercase: false,
      sizeFractionOfHeight: 0.12,
      trackingEm: 0,
      lineHeightEm: CARD_DEFAULT_LINE_HEIGHT_EM,
    },
    subtitle: {
      fontFamily: FONT_FAMILIES.instrumentSerif,
      fontWeight: 400,
      italic: true,
      uppercase: false,
      sizeFractionOfHeight: 0.055,
      trackingEm: 0,
      lineHeightEm: CARD_DEFAULT_LINE_HEIGHT_EM,
    },
  },
};

/** A soft shadow behind light ink, so it reads over a bright picture. */
const CARD_TEXT_SHADOW = { color: "rgba(0, 0, 0, 0.35)", offsetYEm: 0.04, blurEm: 0.12 } as const;

export const CARD_INK_COLORS: Readonly<
  Record<CardInk, { readonly color: string; readonly shadow?: typeof CARD_TEXT_SHADOW }>
> = {
  light: { color: "#FFFFFF", shadow: CARD_TEXT_SHADOW },
  dark: { color: "#2A2340" },
};
