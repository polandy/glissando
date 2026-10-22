import type { PictureFocus } from "../library/picture-focus";
import type { SlideshowTransition } from "../library/own-timing";
import { DEFAULT_CARD_FADE } from "../library/stored-card";
import type { StoredPicture } from "../library/stored-slideshow";
import { inkFor } from "../player/card-palette";
import { isGroundSlide, type Card, type Slide } from "../player/slideshow";
import {
  pictureOf,
  pictureSlide,
  transitionInto,
  veilColourFor,
  withTransition,
  type PictureSource,
} from "./card-slide";

/**
 * Rule F, `TRIP_CHAPTERS.md`: a chapter is a dedicated slide of its stay's first picture, card
 * over a darkened veil in the lower third, inserted right before that picture's own slide. Its
 * duration is added on top, like the title cards; a hidden chapter produces no slide. The player
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

function chapterCard(title: string, subtitle: string, picture: StoredPicture): Card {
  const veilColour = veilColourFor("picture", picture);
  return {
    title,
    subtitle,
    style: "quiet",
    position: "bottom-left",
    ink: inkFor(veilColour),
    entrance: "slow-fade",
    veil: { amount: DEFAULT_CARD_FADE / 100, tint: veilColour },
  };
}

function insertChapterSlide(
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
  const chapterSlide = pictureSlide(picture, 0, sources, focus, CHAPTER_SLIDE_MS, {
    card: chapterCard(chapter.title, chapter.subtitle, picture),
    ...withTransition(transitionInto(index, defaultTransition, CHAPTER_SLIDE_MS)),
  });
  return [...slides.slice(0, index), chapterSlide, ...slides.slice(index)];
}

/**
 * `slides` with one extra slide inserted before each visible chapter's anchor picture, in the
 * order given. Looks the anchor picture up by its image URL, so it finds the right slide
 * regardless of how the opening or closing card may have changed the slide count or positions.
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
      insertChapterSlide(chapter, pictures, current, sources, focus, defaultTransition),
    slides,
  );
}
