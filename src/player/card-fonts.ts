import { type CardStyle, type Slideshow } from "./slideshow.ts";

/**
 * A card font beyond Instrument Sans, which every export already embeds for captions (ADR-0007)
 * and so also covers the `modern`/`quiet` styles' Instrument Sans text (ADR-0032). `assetPath` is
 * relative to the project root, matching the file `src/styles/tokens.css`'s `@font-face` for the
 * same family declares.
 */
export interface CardFontFile {
  readonly assetPath: string;
  readonly family: string;
  /** A CSS `font-weight` value: one weight, or a variable font's range. */
  readonly weight: string;
  readonly style: "normal" | "italic";
}

const BRICOLAGE: CardFontFile = {
  assetPath: "assets/fonts/bricolagegrotesque-latin-wght700.woff2",
  family: "Bricolage Grotesque",
  weight: "700",
  style: "normal",
};
const GEIST_MONO: CardFontFile = {
  assetPath: "assets/fonts/geistmono-latin-wght400-500.woff2",
  family: "Geist Mono",
  weight: "400 500",
  style: "normal",
};
const INSTRUMENT_SERIF: CardFontFile = {
  assetPath: "assets/fonts/instrumentserif-latin-wght400.woff2",
  family: "Instrument Serif",
  weight: "400",
  style: "normal",
};
const INSTRUMENT_SERIF_ITALIC: CardFontFile = {
  assetPath: "assets/fonts/instrumentserif-italic-latin-wght400.woff2",
  family: "Instrument Serif",
  weight: "400",
  style: "italic",
};

/**
 * Every card font file beyond Instrument Sans. The share and TV page (`build/share-page-plugin.ts`)
 * embeds all of these, since it is built once for every slideshow it may ever show; the HTML
 * export (`cardFontFilesUsedBy`) embeds only the ones its own cards use.
 */
export const CARD_FONT_FILES: readonly CardFontFile[] = [
  BRICOLAGE,
  GEIST_MONO,
  INSTRUMENT_SERIF,
  INSTRUMENT_SERIF_ITALIC,
];

/** The extra files (beyond Instrument Sans) a style's title and subtitle need, by style. */
const STYLE_FONT_FILES: Readonly<
  Record<CardStyle, { readonly title?: CardFontFile; readonly subtitle?: CardFontFile }>
> = {
  modern: { title: BRICOLAGE },
  quiet: {},
  bold: { title: BRICOLAGE, subtitle: GEIST_MONO },
  classic: { title: INSTRUMENT_SERIF, subtitle: INSTRUMENT_SERIF_ITALIC },
};

/**
 * The card font files `slideshow`'s cards use, beyond Instrument Sans (every export already
 * embeds that one for captions). Pure, deduplicated by asset path: a slideshow without a card
 * needs none of these, so its export's fonts stay exactly as they are without this feature
 * (ADR-0032).
 */
export function cardFontFilesUsedBy(slideshow: Slideshow): readonly CardFontFile[] {
  return cardFontFilesOf(slideshow.slides.flatMap((slide) => slide.card ?? []));
}

/** What a card's fonts depend on: a stored card's as much as a composed one's. */
export interface CardFontNeeds {
  readonly style: CardStyle;
  readonly subtitle?: string | undefined;
}

/**
 * The card font files `cards` use, beyond Instrument Sans, each once: for a page built from a
 * stored slideshow, before it is composed (`index.html` in a `.glissando` file).
 */
export function cardFontFilesOf(cards: readonly CardFontNeeds[]): readonly CardFontFile[] {
  const files = new Map<string, CardFontFile>();
  for (const card of cards) {
    const spec = STYLE_FONT_FILES[card.style];
    if (spec.title !== undefined) {
      files.set(spec.title.assetPath, spec.title);
    }
    if (card.subtitle !== undefined && spec.subtitle !== undefined) {
      files.set(spec.subtitle.assetPath, spec.subtitle);
    }
  }
  return [...files.values()];
}

/**
 * The distinct card styles `slideshow`'s cards use. The video export waits for each one's fonts
 * to load before it renders a frame, so none ever draws with a fallback font.
 */
export function cardStylesUsedBy(slideshow: Slideshow): readonly CardStyle[] {
  const styles = new Set<CardStyle>();
  for (const slide of slideshow.slides) {
    if (slide.card !== undefined) {
      styles.add(slide.card.style);
    }
  }
  return [...styles];
}

/** `file`'s `@font-face` rule, embedding its bytes as the already-encoded `dataUrl`. */
export function cardFontFaceRule(file: CardFontFile, dataUrl: string): string {
  return (
    `@font-face{font-family:"${file.family}";font-weight:${file.weight};` +
    `font-style:${file.style};src:url(${dataUrl}) format("woff2")}`
  );
}
