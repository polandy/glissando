/** Pure `SlideshowDetails` updates the `slideshow-screen-harness.ts` fixture shares across tests. */
import type { StoredCard } from "../../library/stored-slideshow";
import type { SlideshowMood } from "../../library/slideshow-mood";
import type { SlideshowDetails } from "./view-models";

/** `slideshow` with its title slide set, or removed when `card` is undefined. */
export function withOpeningCard(
  slideshow: SlideshowDetails,
  card: StoredCard | undefined,
): SlideshowDetails {
  const { openingCard, ...rest } = slideshow;
  void openingCard;
  return card === undefined ? rest : { ...rest, openingCard: card };
}

/** `slideshow` with its closing slide set, or removed when `card` is undefined. */
export function withClosingCard(
  slideshow: SlideshowDetails,
  card: StoredCard | undefined,
): SlideshowDetails {
  const { closingCard, ...rest } = slideshow;
  void closingCard;
  return card === undefined ? rest : { ...rest, closingCard: card };
}

/** `slideshow` with its mood set, or removed (Custom) when `mood` is undefined. */
export function withMood(
  slideshow: SlideshowDetails,
  mood: SlideshowMood | undefined,
): SlideshowDetails {
  const { mood: previous, ...rest } = slideshow;
  void previous;
  return mood === undefined ? rest : { ...rest, mood };
}
