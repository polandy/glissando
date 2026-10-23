import type { PictureFocus } from "../library/picture-focus";
import type { SlideshowTransition } from "../library/own-timing";
import { DEFAULT_CARD_FADE } from "../library/stored-card";
import type { StoredPicture } from "../library/stored-slideshow";
import { inkFor } from "../player/card-palette";
import { CARD_REVEAL_MS } from "../player/card-timing";
import { isGroundSlide, type Card, type PictureSlide, type Slide } from "../player/slideshow";
import {
  pictureOf,
  pictureSlide,
  revealFitsBeforeTransitionOut,
  transitionInto,
  veilColourFor,
  withTransition,
  type PictureSource,
} from "./card-slide";

/**
 * Rule F, `TRIP_CHAPTERS.md`: a chapter plays over its stay's first picture's own slide, which
 * keeps running its own Ken Burns motion from the start. The card darkens the picture and sets
 * its text in the lower third immediately, then both fade away (`CARD_REVEAL_MS`) so the picture
 * is left to play on, plain, for the rest of its own duration — `CHAPTER_SLIDE_MS` is added to
 * that slide's own duration, like the title cards. A hidden chapter produces no slide. Only when
 * the anchor cannot carry the card itself — paired into a portrait slide, or a video clip too
 * short for the reveal to finish before its transition out — does a dedicated slide of just that
 * picture play first instead, card for its whole `CHAPTER_SLIDE_MS`, same as before. The player
 * stays free of chapter logic — this builds an ordinary `Card` from the existing `"quiet"` style.
 */
export const CHAPTER_SLIDE_MS = 3000;

export interface ComposedChapter {
  readonly anchorPictureId: string;
  readonly title: string;
  readonly subtitle: string;
}

function slideShowsPicture(slide: Slide, imageSrc: string): boolean {
  if (isGroundSlide(slide)) {
    return false;
  }
  return slide.image.src === imageSrc || slide.partner?.image.src === imageSrc;
}

function chapterCard(
  title: string,
  subtitle: string,
  picture: StoredPicture,
  revealAtMs?: number,
): Card {
  const veilColour = veilColourFor("picture", picture);
  return {
    title,
    subtitle,
    style: "quiet",
    position: "bottom-left",
    ink: inkFor(veilColour),
    entrance: "slow-fade",
    veil: { amount: DEFAULT_CARD_FADE / 100, tint: veilColour },
    ...(revealAtMs === undefined ? {} : { revealAtMs }),
  };
}

/**
 * `slides` with the chapter card merged onto the anchor's own slide at `index`, holding then
 * revealing so the veil and text are gone by the time `CHAPTER_SLIDE_MS` has elapsed —
 * `undefined` when the anchor cannot carry it: paired into a portrait slide, or a video clip too
 * short for the reveal to finish before its transition out (never lengthened for a card).
 */
function mergeChapterOntoAnchor(
  chapter: ComposedChapter,
  picture: StoredPicture,
  slides: readonly Slide[],
  index: number,
): readonly Slide[] | undefined {
  const anchor = slides[index] as PictureSlide;
  if (anchor.partner !== undefined) {
    return undefined;
  }
  const revealAtMs = CHAPTER_SLIDE_MS - CARD_REVEAL_MS;
  const card = chapterCard(chapter.title, chapter.subtitle, picture, revealAtMs);
  if (anchor.video !== undefined) {
    if (!revealFitsBeforeTransitionOut(anchor, revealAtMs)) {
      return undefined;
    }
    const merged: PictureSlide = { ...anchor, card };
    return [...slides.slice(0, index), merged, ...slides.slice(index + 1)];
  }
  const merged: PictureSlide = {
    ...anchor,
    durationMs: anchor.durationMs + CHAPTER_SLIDE_MS,
    card,
  };
  return [...slides.slice(0, index), merged, ...slides.slice(index + 1)];
}

/**
 * Fallback for `mergeChapterOntoAnchor`: a dedicated slide of the anchor picture, card for its
 * whole `CHAPTER_SLIDE_MS`, inserted right before the slide that could not carry it.
 */
function insertChapterSlide(
  chapter: ComposedChapter,
  picture: StoredPicture,
  slides: readonly Slide[],
  index: number,
  sources: PictureSource,
  focus: ReadonlyMap<string, PictureFocus>,
  defaultTransition: SlideshowTransition,
): readonly Slide[] {
  const chapterSlide = pictureSlide(picture, 0, sources, focus, CHAPTER_SLIDE_MS, {
    card: chapterCard(chapter.title, chapter.subtitle, picture),
    ...withTransition(transitionInto(index, defaultTransition, CHAPTER_SLIDE_MS)),
  });
  return [...slides.slice(0, index), chapterSlide, ...slides.slice(index)];
}

function applyChapter(
  chapter: ComposedChapter,
  pictures: readonly StoredPicture[],
  slides: readonly Slide[],
  sources: PictureSource,
  focus: ReadonlyMap<string, PictureFocus>,
  defaultTransition: SlideshowTransition,
): readonly Slide[] {
  const picture = pictureOf(pictures, chapter.anchorPictureId);
  const imageSrc = sources.picture(picture.id);
  const index = slides.findIndex((slide) => slideShowsPicture(slide, imageSrc));
  if (index < 0) {
    throw new RangeError(`no composed slide shows picture "${picture.id}"`);
  }
  return (
    mergeChapterOntoAnchor(chapter, picture, slides, index) ??
    insertChapterSlide(chapter, picture, slides, index, sources, focus, defaultTransition)
  );
}

/**
 * `slides` with each visible chapter composed onto its anchor picture, in the order given. Looks
 * the anchor picture up by its image URL, so it finds the right slide regardless of how the
 * opening or closing card may have changed the slide count or positions.
 */
export function composeChapters(
  chapters: readonly ComposedChapter[],
  pictures: readonly StoredPicture[],
  slides: readonly Slide[],
  sources: PictureSource,
  focus: ReadonlyMap<string, PictureFocus>,
  defaultTransition: SlideshowTransition,
): readonly Slide[] {
  return chapters.reduce(
    (current, chapter) =>
      applyChapter(chapter, pictures, current, sources, focus, defaultTransition),
    slides,
  );
}
