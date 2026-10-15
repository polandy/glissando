import { graphemes } from "./caption";
import type { Card, CardEntrance } from "./slideshow";

/**
 * An entrance's items (`dev-docs/player/TITLE_CARDS.md` § Entrances): `rise`, `focus` and
 * `slow-fade` move the whole text as one item; `words` moves each word, `letters` each
 * grapheme. Spaces are never items. Shared by `card-timing.ts` (counts, for the stagger and
 * `cardEnterMs`) and `card-layout.ts` (the items' slices of the laid-out lines).
 */
export type ItemGranularity = "block" | "word" | "letter";

const wordSegmenter = new Intl.Segmenter(undefined, { granularity: "word" });

function granularityOf(entrance: CardEntrance): ItemGranularity {
  switch (entrance) {
    case "words":
      return "word";
    case "letters":
      return "letter";
    default:
      return "block";
  }
}

/** A segment of `text` with its own start offset, in UTF-16 code units from the start. */
export interface TextSegment {
  readonly text: string;
  readonly index: number;
}

/**
 * `text`'s word-like segments with their start offset, punctuation-only and whitespace segments
 * dropped; `card-layout.ts`'s item slices read the offsets to find each word in its line.
 */
export function wordSegments(text: string): readonly TextSegment[] {
  return Array.from(wordSegmenter.segment(text))
    .filter((segment) => segment.isWordLike)
    .map((segment) => ({ text: segment.segment, index: segment.index }));
}

/**
 * `text`'s non-space graphemes with their start offset; a space is never an item, but still
 * advances the offset so the following grapheme's slice starts in the right place.
 */
export function letterSegments(text: string): readonly TextSegment[] {
  const segments: TextSegment[] = [];
  let index = 0;
  for (const grapheme of graphemes(text)) {
    if (grapheme !== " ") {
      segments.push({ text: grapheme, index });
    }
    index += grapheme.length;
  }
  return segments;
}

/** `text` split into its word-like segments; punctuation-only and whitespace segments drop out. */
export function words(text: string): readonly string[] {
  return wordSegments(text).map((segment) => segment.text);
}

/** `text` split into graphemes, spaces excluded since a space is never an item. */
export function letters(text: string): readonly string[] {
  return letterSegments(text).map((segment) => segment.text);
}

/** `card`'s texts in reading order: the title, then the subtitle if it has one. */
export function cardTexts(card: Pick<Card, "title" | "subtitle">): readonly string[] {
  return card.subtitle === undefined ? [card.title] : [card.title, card.subtitle];
}

/** How many items `card`'s entrance moves: 1 for a whole-text entrance, else words or letters. */
export function itemCount(card: Pick<Card, "title" | "subtitle" | "entrance">): number {
  const granularity = granularityOf(card.entrance);
  if (granularity === "block") {
    return 1;
  }
  const split = granularity === "word" ? words : letters;
  return cardTexts(card).reduce((total, text) => total + split(text).length, 0);
}

export function itemGranularity(entrance: CardEntrance): ItemGranularity {
  return granularityOf(entrance);
}
