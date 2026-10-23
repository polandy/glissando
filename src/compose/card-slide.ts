import type { PictureFocus } from "../library/picture-focus";
import { CUT_TRANSITION, type SlideshowTransition } from "../library/own-timing";
import type { CardColour, CardTint, StoredCard, StoredPicture } from "../library/stored-slideshow";
import { CARD_SWATCHES, type CardSwatchId } from "../player/card-palette";
import { CARD_REVEAL_MS } from "../player/card-timing";
import type { Card, CardInk, PictureSlide, Slide, Transition } from "../player/slideshow";
import { transitionDurationMs } from "./auto-transition";
import { pictureKenBurns } from "./picture-ken-burns";
import { automaticTransition } from "./picture-transition";

/**
 * Building blocks shared by `compose-cards.ts` (the opening card) and `compose-closing-card.ts`
 * (the closing card) — see `TITLE_CARD_COMPOSITION.md`.
 */

export const CARD_SLIDE_MS = 4000;
export const CARD_HOLD_MS = 2500;
export const CARD_ALONE_MS = 1500;
export const CARD_END_FADE_MS = 1500;

/** Resolves a stored picture id to the URL the player loads it from. */
export interface PictureSource {
  picture(id: string): string;
}

export interface ComposedCards {
  readonly slides: readonly Slide[];
  readonly endFadeMs?: number;
}

export function transitionInto(
  index: number,
  defaultTransition: SlideshowTransition,
  durationMs: number,
): Transition | undefined {
  const choice = automaticTransition(index, defaultTransition);
  return choice === CUT_TRANSITION
    ? undefined
    : { effect: choice, durationMs: transitionDurationMs(durationMs) };
}

export function withTransition(transition: Transition | undefined): {
  transitionToNext?: Transition;
} {
  return transition === undefined ? {} : { transitionToNext: transition };
}

/** A colour background's ground: a swatch's hex by id, or a picture-derived hex used as-is. */
export function groundColourOf(colour: CardColour): string {
  return isCardSwatchId(colour) ? CARD_SWATCHES[colour] : colour;
}

export function isCardSwatchId(colour: CardColour): colour is CardSwatchId {
  return colour in CARD_SWATCHES;
}

/** A picture background's veil tint (`TITLE_CARD_COMPOSITION.md`). */
export function veilColourFor(tint: CardTint, picture: StoredPicture): string {
  switch (tint) {
    case "picture":
      return picture.colours.veil;
    case "light":
      return CARD_SWATCHES.cream;
    case "dark":
      return CARD_SWATCHES.plum;
  }
}

export function pictureOf(pictures: readonly StoredPicture[], id: string): StoredPicture {
  const picture = pictures.find((candidate) => candidate.id === id);
  if (picture === undefined) {
    throw new RangeError(`pictureId: no picture in the slideshow has id "${id}"`);
  }
  return picture;
}

export function pictureSlide(
  picture: StoredPicture,
  kenBurnsIndex: number,
  sources: PictureSource,
  focus: ReadonlyMap<string, PictureFocus>,
  durationMs: number,
  extra: Pick<PictureSlide, "card" | "transitionToNext">,
): PictureSlide {
  return {
    image: { src: sources.picture(picture.id), capturedAt: picture.capturedAt },
    durationMs,
    kenBurns: pictureKenBurns(kenBurnsIndex, picture, focus.get(picture.id)),
    ...extra,
  };
}

/** Whether `slide`'s reveal, started at `revealAtMs`, ends before it hands over to the next
 * slide — the test a video slide (never lengthened for a card) must pass to merge one on. */
export function revealFitsBeforeTransitionOut(slide: PictureSlide, revealAtMs: number): boolean {
  const transitionOutMs = slide.transitionToNext?.durationMs ?? 0;
  return revealAtMs + CARD_REVEAL_MS <= slide.durationMs - transitionOutMs;
}

export function cardFace(
  card: StoredCard,
  ink: CardInk,
  extra: Partial<Pick<Card, "veil" | "enterAtMs" | "revealAtMs">>,
): Card {
  return {
    title: card.title,
    ...(card.subtitle === undefined ? {} : { subtitle: card.subtitle }),
    style: card.style,
    position: card.position,
    entrance: card.entrance,
    ink,
    ...(extra.veil === undefined ? {} : { veil: extra.veil }),
    ...(extra.enterAtMs === undefined ? {} : { enterAtMs: extra.enterAtMs }),
    ...(extra.revealAtMs === undefined ? {} : { revealAtMs: extra.revealAtMs }),
  };
}
