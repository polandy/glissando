import { describe, expect, it } from "vitest";
import {
  CARD_FONT_FILES,
  cardFontFaceRule,
  cardFontFilesUsedBy,
  cardStylesUsedBy,
  type CardFontFile,
} from "./card-fonts";
import { SLIDESHOW_FORMAT_VERSION, type Card, type CardStyle, type Slideshow } from "./slideshow";

const BRICOLAGE_PATH = "assets/fonts/bricolagegrotesque-latin-wght700.woff2";
const GEIST_MONO_PATH = "assets/fonts/geistmono-latin-wght400-500.woff2";
const INSTRUMENT_SERIF_PATH = "assets/fonts/instrumentserif-latin-wght400.woff2";
const INSTRUMENT_SERIF_ITALIC_PATH = "assets/fonts/instrumentserif-italic-latin-wght400.woff2";

function card(style: CardStyle, subtitle?: string): Card {
  return subtitle === undefined
    ? { title: "Rome", style, position: "centre", ink: "light" }
    : { title: "Rome", subtitle, style, position: "centre", ink: "light" };
}

/** A ground slide carrying `card`, the simplest slide a card can sit on. */
function slideshowWithCards(...cards: Card[]): Slideshow {
  return {
    formatVersion: SLIDESHOW_FORMAT_VERSION,
    title: "Rome",
    slides: cards.map((cardOnSlide) => ({
      ground: "#000000",
      durationMs: 4000,
      card: cardOnSlide,
    })),
  };
}

function withoutCards(): Slideshow {
  return {
    formatVersion: SLIDESHOW_FORMAT_VERSION,
    title: "Rome",
    slides: [
      {
        image: { src: "p0", capturedAt: "2026-07-01T10:00:00Z" },
        durationMs: 4000,
        kenBurns: {
          from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
          to: { zoom: 1.1, centerX: 0.5, centerY: 0.5 },
          easing: "linear",
        },
      },
    ],
  };
}

describe("cardFontFilesUsedBy", () => {
  it("needs nothing without a card", () => {
    expect(cardFontFilesUsedBy(withoutCards())).toEqual([]);
  });

  it.each<{ style: CardStyle; subtitle: string | undefined; paths: readonly string[] }>([
    { style: "modern", subtitle: undefined, paths: [BRICOLAGE_PATH] },
    { style: "modern", subtitle: "By the sea", paths: [BRICOLAGE_PATH] },
    { style: "quiet", subtitle: undefined, paths: [] },
    { style: "quiet", subtitle: "By the sea", paths: [] },
    { style: "bold", subtitle: undefined, paths: [BRICOLAGE_PATH] },
    { style: "bold", subtitle: "By the sea", paths: [BRICOLAGE_PATH, GEIST_MONO_PATH] },
    { style: "classic", subtitle: undefined, paths: [INSTRUMENT_SERIF_PATH] },
    {
      style: "classic",
      subtitle: "By the sea",
      paths: [INSTRUMENT_SERIF_PATH, INSTRUMENT_SERIF_ITALIC_PATH],
    },
  ])("needs $paths for a $style card with subtitle $subtitle", ({ style, subtitle, paths }) => {
    const files = cardFontFilesUsedBy(slideshowWithCards(card(style, subtitle)));
    expect(files.map((file) => file.assetPath)).toEqual(paths);
  });

  it("lists each needed file once, across every card in the slideshow", () => {
    const files = cardFontFilesUsedBy(
      slideshowWithCards(card("modern"), card("bold", "By the sea"), card("modern")),
    );

    expect(files.map((file) => file.assetPath)).toEqual([BRICOLAGE_PATH, GEIST_MONO_PATH]);
  });
});

describe("cardStylesUsedBy", () => {
  it("is empty without a card", () => {
    expect(cardStylesUsedBy(withoutCards())).toEqual([]);
  });

  it("lists each style used once, in first-use order", () => {
    const styles = cardStylesUsedBy(
      slideshowWithCards(card("bold"), card("classic"), card("bold")),
    );

    expect(styles).toEqual(["bold", "classic"]);
  });
});

/** The known font file at `assetPath`, or a throw naming it. */
function fontFile(assetPath: string): CardFontFile {
  const file = CARD_FONT_FILES.find((candidate) => candidate.assetPath === assetPath);
  if (file === undefined) throw new Error(`no card font file at ${assetPath}`);
  return file;
}

describe("cardFontFaceRule", () => {
  it("writes the font's family, weight, style and data: URL source", () => {
    const file = fontFile(BRICOLAGE_PATH);

    expect(cardFontFaceRule(file, "data:font/woff2;base64,AAAA")).toBe(
      '@font-face{font-family:"Bricolage Grotesque";font-weight:700;font-style:normal;' +
        'src:url(data:font/woff2;base64,AAAA) format("woff2")}',
    );
  });

  it("carries an italic style through to the rule, e.g. for Instrument Serif's subtitle", () => {
    const file = fontFile(INSTRUMENT_SERIF_ITALIC_PATH);

    expect(cardFontFaceRule(file, "data:font/woff2;base64,BBBB")).toBe(
      '@font-face{font-family:"Instrument Serif";font-weight:400;font-style:italic;' +
        'src:url(data:font/woff2;base64,BBBB) format("woff2")}',
    );
  });
});
