import type { PictureFocus } from "../library/picture-focus";
import { CUT_TRANSITION, type SlideshowTransition } from "../library/own-timing";
import type { StoredCard, StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import { CARD_SWATCHES, inkFor } from "../player/card-palette";
import { CARD_REVEAL_MS } from "../player/card-timing";
import type {
  Card,
  CardInk,
  GroundSlide,
  PictureSlide,
  Slide,
  Transition,
} from "../player/slideshow";
import { transitionDurationMs } from "./auto-transition";
import { pictureKenBurns } from "./picture-ken-burns";
import { automaticTransition } from "./picture-transition";
import { snapToNextBeat } from "./snap-to-beats";
import { slideOfPicture, type SlideUnit } from "./slide-units";

/**
 * Inserts the slideshow's title and closing cards into its composed slides (ADR-0032,
 * `TITLE_CARDS.md` § Composition). Runs once `slides` already has every picture slide composed,
 * so it only adds slides or extends the first and last one; nothing else about them changes.
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

export function composeCards(
  stored: Pick<StoredSlideshow, "pictures" | "openingCard" | "closingCard">,
  units: readonly SlideUnit[],
  slides: readonly Slide[],
  sources: PictureSource,
  focus: ReadonlyMap<string, PictureFocus>,
  defaultTransition: SlideshowTransition,
  beatsMs: readonly number[] | undefined,
): ComposedCards {
  const withOpening = composeOpening(
    stored.openingCard,
    stored.pictures,
    units,
    slides,
    sources,
    focus,
    defaultTransition,
    beatsMs,
  );
  const withClosing = composeClosing(
    stored.closingCard,
    stored.pictures,
    units,
    withOpening,
    sources,
    focus,
    defaultTransition,
  );
  return withClosing;
}

function composeOpening(
  card: StoredCard | undefined,
  pictures: readonly StoredPicture[],
  units: readonly SlideUnit[],
  slides: readonly Slide[],
  sources: PictureSource,
  focus: ReadonlyMap<string, PictureFocus>,
  defaultTransition: SlideshowTransition,
  beatsMs: readonly number[] | undefined,
): readonly Slide[] {
  if (card === undefined || card.title === "") {
    return slides;
  }
  if (card.background.kind === "colour") {
    const ground = CARD_SWATCHES[card.background.colour];
    const groundSlide: GroundSlide = {
      ground,
      durationMs: CARD_SLIDE_MS,
      card: cardFace(card, inkFor(ground), {}),
      ...withTransition(transitionInto(0, defaultTransition, CARD_SLIDE_MS)),
    };
    return [groundSlide, ...slides];
  }

  const { pictureId, fade } = card.background;
  const picture = pictureOf(pictures, pictureId);
  const unitIndex = slideOfPicture(units, pictures.indexOf(picture));
  const mergeable = unitIndex === 0 && units[0]?.pictureIndices.length === 1;
  const veil = { amount: fade / 100, tint: CARD_SWATCHES.plum };
  const ink = inkFor(CARD_SWATCHES.plum);

  if (!card.motion) {
    const leadSlide = pictureSlide(picture, 0, sources, focus, CARD_SLIDE_MS, {
      card: cardFace(card, ink, { veil }),
      ...withTransition(transitionInto(0, defaultTransition, CARD_SLIDE_MS)),
    });
    return [leadSlide, ...slides];
  }

  const revealAtMs = snapToNextBeat(beatsMs, CARD_HOLD_MS);
  const leadMs = revealAtMs + CARD_REVEAL_MS;
  if (mergeable) {
    const first = slides[0] as PictureSlide;
    const merged: PictureSlide = {
      ...first,
      durationMs: first.durationMs + leadMs,
      card: cardFace(card, ink, { veil, revealAtMs }),
    };
    return [merged, ...slides.slice(1)];
  }
  const durationMs = leadMs + CARD_ALONE_MS;
  const leadSlide = pictureSlide(picture, 0, sources, focus, durationMs, {
    card: cardFace(card, ink, { veil, revealAtMs }),
    ...withTransition(transitionInto(0, defaultTransition, durationMs)),
  });
  return [leadSlide, ...slides];
}

function composeClosing(
  card: StoredCard | undefined,
  pictures: readonly StoredPicture[],
  units: readonly SlideUnit[],
  slides: readonly Slide[],
  sources: PictureSource,
  focus: ReadonlyMap<string, PictureFocus>,
  defaultTransition: SlideshowTransition,
): ComposedCards {
  if (card === undefined || card.title === "") {
    return { slides };
  }
  if (card.background.kind === "colour") {
    const ground = CARD_SWATCHES[card.background.colour];
    const groundSlide: GroundSlide = {
      ground,
      durationMs: CARD_SLIDE_MS + CARD_END_FADE_MS,
      card: cardFace(card, inkFor(ground), {}),
    };
    return {
      slides: [...withTransitionToLast(slides, defaultTransition), groundSlide],
      endFadeMs: CARD_END_FADE_MS,
    };
  }

  const { pictureId, fade } = card.background;
  const picture = pictureOf(pictures, pictureId);
  const unitIndex = slideOfPicture(units, pictures.indexOf(picture));
  const isLast = unitIndex === units.length - 1 && units[unitIndex]?.pictureIndices.length === 1;
  const veil = { amount: fade / 100, tint: CARD_SWATCHES.plum };
  const ink = inkFor(CARD_SWATCHES.plum);
  const aloneMs = card.motion ? CARD_ALONE_MS : 0;

  if (isLast) {
    const last = slides.at(-1) as PictureSlide;
    const extended: PictureSlide = {
      ...last,
      durationMs: last.durationMs + CARD_SLIDE_MS + CARD_END_FADE_MS,
      card: cardFace(card, ink, { veil, enterAtMs: card.motion ? last.durationMs : 0 }),
    };
    return { slides: [...slides.slice(0, -1), extended], endFadeMs: CARD_END_FADE_MS };
  }
  const trailingSlide = pictureSlide(
    picture,
    units.length,
    sources,
    focus,
    aloneMs + CARD_SLIDE_MS + CARD_END_FADE_MS,
    { card: cardFace(card, ink, { veil, enterAtMs: aloneMs }) },
  );
  return {
    slides: [...withTransitionToLast(slides, defaultTransition), trailingSlide],
    endFadeMs: CARD_END_FADE_MS,
  };
}

/** `slides` with a transition added to its last slide, since another one now follows it. */
function withTransitionToLast(
  slides: readonly Slide[],
  defaultTransition: SlideshowTransition,
): readonly Slide[] {
  const last = slides.at(-1);
  if (last === undefined) {
    return slides;
  }
  const transition = transitionInto(slides.length - 1, defaultTransition, last.durationMs);
  return transition === undefined
    ? slides
    : [...slides.slice(0, -1), { ...last, transitionToNext: transition }];
}

function transitionInto(
  index: number,
  defaultTransition: SlideshowTransition,
  durationMs: number,
): Transition | undefined {
  const choice = automaticTransition(index, defaultTransition);
  return choice === CUT_TRANSITION
    ? undefined
    : { effect: choice, durationMs: transitionDurationMs(durationMs) };
}

function withTransition(transition: Transition | undefined): { transitionToNext?: Transition } {
  return transition === undefined ? {} : { transitionToNext: transition };
}

function pictureOf(pictures: readonly StoredPicture[], id: string): StoredPicture {
  const picture = pictures.find((candidate) => candidate.id === id);
  if (picture === undefined) {
    throw new RangeError(`pictureId: no picture in the slideshow has id "${id}"`);
  }
  return picture;
}

function pictureSlide(
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

function cardFace(
  card: StoredCard,
  ink: CardInk,
  extra: Partial<Pick<Card, "veil" | "enterAtMs" | "revealAtMs">>,
): Card {
  return {
    title: card.title,
    ...(card.subtitle === undefined ? {} : { subtitle: card.subtitle }),
    style: card.style,
    position: card.position,
    ink,
    ...(extra.veil === undefined ? {} : { veil: extra.veil }),
    ...(extra.enterAtMs === undefined ? {} : { enterAtMs: extra.enterAtMs }),
    ...(extra.revealAtMs === undefined ? {} : { revealAtMs: extra.revealAtMs }),
  };
}
