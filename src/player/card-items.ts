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

/** `text` split into its word-like segments; punctuation-only and whitespace segments drop out. */
export function words(text: string): readonly string[] {
  return Array.from(wordSegmenter.segment(text))
    .filter((segment) => segment.isWordLike)
    .map((segment) => segment.segment);
}

/** `text` split into graphemes, spaces excluded since a space is never an item. */
export function letters(text: string): readonly string[] {
  return graphemes(text).filter((grapheme) => grapheme !== " ");
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
