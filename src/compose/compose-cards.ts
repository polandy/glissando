import type { PictureFocus } from "../library/picture-focus";
import type { SlideshowTransition } from "../library/own-timing";
import type { StoredCard, StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import { inkFor } from "../player/card-palette";
import { CARD_REVEAL_MS } from "../player/card-timing";
import type { GroundSlide, PictureSlide, Slide } from "../player/slideshow";
import { snapToNextBeat } from "./snap-to-beats";
import { slideOfPicture, type SlideUnit } from "./slide-units";
import {
  CARD_ALONE_MS,
  CARD_HOLD_MS,
  CARD_SLIDE_MS,
  cardFace,
  groundColourOf,
  pictureOf,
  pictureSlide,
  transitionInto,
  veilColourFor,
  withTransition,
  type ComposedCards,
  type PictureSource,
} from "./card-slide";
import { composeClosing } from "./compose-closing-card";

/**
 * Inserts the slideshow's title and closing cards into its composed slides (ADR-0032,
 * `TITLE_CARD_COMPOSITION.md`). Runs once `slides` already has every picture slide composed, so
 * it only adds slides or extends the first and last one; nothing else about them changes.
 */

export { CARD_ALONE_MS, CARD_END_FADE_MS, CARD_HOLD_MS, CARD_SLIDE_MS } from "./card-slide";
export type { ComposedCards, PictureSource } from "./card-slide";

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
    const ground = groundColourOf(card.background.colour);
    const groundSlide: GroundSlide = {
      ground,
      durationMs: CARD_SLIDE_MS,
      card: cardFace(card, inkFor(ground), {}),
      ...withTransition(transitionInto(0, defaultTransition, CARD_SLIDE_MS)),
    };
    return [groundSlide, ...slides];
  }

  const { pictureId, fade, tint } = card.background;
  const picture = pictureOf(pictures, pictureId);
  const unitIndex = slideOfPicture(units, pictures.indexOf(picture));
  const mergeable = unitIndex === 0 && units[0]?.pictureIndices.length === 1;
  const veilColour = veilColourFor(tint, picture);
  const veil = { amount: fade / 100, tint: veilColour };
  const ink = inkFor(veilColour);

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
    // A video slide keeps its own length (VIDEO_SLIDES.md § Composition): the card merges onto
    // it only if the reveal still finishes before the slide hands over to the next one.
    if (first.video === undefined || revealFitsBeforeTransitionOut(first, revealAtMs)) {
      const merged: PictureSlide = {
        ...first,
        ...(first.video === undefined ? { durationMs: first.durationMs + leadMs } : {}),
        card: cardFace(card, ink, { veil, revealAtMs }),
      };
      return [merged, ...slides.slice(1)];
    }
  }
  const durationMs = leadMs + CARD_ALONE_MS;
  const leadSlide = pictureSlide(picture, 0, sources, focus, durationMs, {
    card: cardFace(card, ink, { veil, revealAtMs }),
    ...withTransition(transitionInto(0, defaultTransition, durationMs)),
  });
  return [leadSlide, ...slides];
}

/** Whether the reveal ends before `slide` hands over to the next one. */
function revealFitsBeforeTransitionOut(slide: PictureSlide, revealAtMs: number): boolean {
  const transitionOutMs = slide.transitionToNext?.durationMs ?? 0;
  return revealAtMs + CARD_REVEAL_MS <= slide.durationMs - transitionOutMs;
}
