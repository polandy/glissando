import type { PictureFocus } from "../library/picture-focus";
import type { SlideshowTransition } from "../library/own-timing";
import type { StoredCard, StoredPicture } from "../library/stored-slideshow";
import { inkFor } from "../player/card-palette";
import type { CardInk, GroundSlide, PictureSlide, Slide } from "../player/slideshow";
import {
  CARD_ALONE_MS,
  CARD_END_FADE_MS,
  CARD_SLIDE_MS,
  cardFace,
  groundColourOf,
  pictureOf,
  pictureSlide,
  transitionInto,
  veilColourFor,
  type ComposedCards,
  type PictureSource,
} from "./card-slide";
import { slideOfPicture, type SlideUnit } from "./slide-units";

/** Inserts the slideshow's closing card into its composed slides (`TITLE_CARD_COMPOSITION.md`). */
export function composeClosing(
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
    const ground = groundColourOf(card.background.colour);
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

  const { pictureId, fade, tint } = card.background;
  const picture = pictureOf(pictures, pictureId);
  const unitIndex = slideOfPicture(units, pictures.indexOf(picture));
  const isLast = unitIndex === units.length - 1 && units[unitIndex]?.pictureIndices.length === 1;
  const veilColour = veilColourFor(tint, picture);
  const veil = { amount: fade / 100, tint: veilColour };
  const ink = inkFor(veilColour);
  const aloneMs = card.motion ? CARD_ALONE_MS : 0;

  if (isLast) {
    const merged = mergeOverLast(slides, card, ink, veil);
    if (merged !== undefined) {
      return { slides: merged, endFadeMs: CARD_END_FADE_MS };
    }
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

/**
 * The last slide with the closing card merged onto it, keeping its own `durationMs` and
 * extending a picture slide's by `CARD_SLIDE_MS + CARD_END_FADE_MS`. A video slide is never
 * lengthened (`VIDEO_SLIDES.md` § Composition): `undefined` here means the clip is too short
 * to carry the card without it entering under the transition into the slide, and the caller
 * falls back to a trailing slide of its own.
 */
function mergeOverLast(
  slides: readonly Slide[],
  card: StoredCard,
  ink: CardInk,
  veil: { amount: number; tint: string },
): readonly Slide[] | undefined {
  const last = slides.at(-1) as PictureSlide;
  if (last.video === undefined) {
    const extended: PictureSlide = {
      ...last,
      durationMs: last.durationMs + CARD_SLIDE_MS + CARD_END_FADE_MS,
      card: cardFace(card, ink, { veil, enterAtMs: card.motion ? last.durationMs : 0 }),
    };
    return [...slides.slice(0, -1), extended];
  }
  if (!card.motion) {
    const extended: PictureSlide = { ...last, card: cardFace(card, ink, { veil, enterAtMs: 0 }) };
    return [...slides.slice(0, -1), extended];
  }
  const enterAtMs = last.durationMs - CARD_SLIDE_MS - CARD_END_FADE_MS;
  const transitionInMs = slides.at(-2)?.transitionToNext?.durationMs ?? 0;
  if (enterAtMs < transitionInMs) {
    return undefined;
  }
  const extended: PictureSlide = { ...last, card: cardFace(card, ink, { veil, enterAtMs }) };
  return [...slides.slice(0, -1), extended];
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
