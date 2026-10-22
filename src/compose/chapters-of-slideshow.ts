import type { AddedChapter, ChapterEdit, StoredSlideshow } from "../library/stored-slideshow";
import type { Place } from "../places/nearest-place";
import { dateOfDay, dayNumbersOf, showDays } from "./chapter-days";
import { staysOf } from "./chapter-stays";
import { dateOnlySubtitle, dayTitle, multiDaySubtitle, singleDaySubtitle } from "./chapter-text";

/**
 * The listing a chapter strip and the composer both build from (Rule E/F, `TRIP_CHAPTERS.md`):
 * one source of truth, so what the editor shows always matches what plays.
 */

export type ChapterKind = "automatic" | "added";

export interface SlideshowChapter {
  readonly kind: ChapterKind;
  /** The picture the chapter sits before. */
  readonly anchorPictureId: string;
  readonly title: string;
  readonly subtitle: string;
  readonly automaticTitle: string;
  readonly automaticSubtitle: string;
  readonly titleEdited: boolean;
  readonly subtitleEdited: boolean;
  /** An automatic chapter the owner hid; always `false` for an added one. */
  readonly hidden: boolean;
}

interface AutomaticChapterText {
  readonly pictureId: string;
  readonly title: string;
  readonly subtitle: string;
}

/**
 * The automatic chapters (Rule C): one before the first picture of each stay except the first,
 * none when the show spans under two calendar days, chapters are off, or the order is the
 * owner's own (ADR for `ownOrder`).
 */
function automaticChapterTexts(
  slideshow: StoredSlideshow,
  locale: string,
): readonly AutomaticChapterText[] {
  if (slideshow.automaticChaptersOff === true || slideshow.ownOrder === true) {
    return [];
  }
  if (showDays(slideshow.pictures).length < 2) {
    return [];
  }
  const stays = staysOf(slideshow.pictures);
  return stays.slice(1).map((stay) => {
    // Every stay but the first is created only once a placed day set its reference, so this one
    // always has a place (see chapter-stays.ts).
    const place = stay.place as Place;
    const startedAt = dateOfDay(slideshow.pictures, stay.startDay);
    const subtitle =
      stay.startDay === stay.endDay
        ? singleDaySubtitle(stay.startDay, startedAt, locale)
        : multiDaySubtitle(
            stay.startDay,
            stay.endDay,
            startedAt,
            dateOfDay(slideshow.pictures, stay.endDay),
            locale,
          );
    return { pictureId: stay.firstPicture.id, title: place.name, subtitle };
  });
}

/** Rule D's text for a manual chapter: its anchor picture's calendar day, with or without a place. */
function manualChapterText(
  slideshow: StoredSlideshow,
  beforePictureId: string,
  locale: string,
): { readonly title: string; readonly subtitle: string } {
  const numbered = dayNumbersOf(slideshow.pictures);
  const entry = numbered.find(({ picture }) => picture.id === beforePictureId);
  if (entry === undefined) {
    throw new RangeError(`slideshow "${slideshow.id}" holds no picture "${beforePictureId}"`);
  }
  const mainPlace = showDays(slideshow.pictures).find((day) => day.day === entry.day)?.mainPlace;
  const at = dateOfDay(slideshow.pictures, entry.day);
  if (mainPlace === undefined) {
    return { title: dayTitle(entry.day, locale), subtitle: dateOnlySubtitle(at, locale) };
  }
  return { title: mainPlace.name, subtitle: singleDaySubtitle(entry.day, at, locale) };
}

function editFor(
  edits: readonly ChapterEdit[] | undefined,
  pictureId: string,
): ChapterEdit | undefined {
  return edits?.find((edit) => edit.pictureId === pictureId);
}

/** Every chapter of the slideshow, automatic and added, in play order; the strip's one source. */
export function chaptersOfSlideshow(
  slideshow: StoredSlideshow,
  locale: string,
): readonly SlideshowChapter[] {
  const automatic: SlideshowChapter[] = automaticChapterTexts(slideshow, locale).map((chapter) => {
    const edit = editFor(slideshow.chapterEdits, chapter.pictureId);
    return {
      kind: "automatic",
      anchorPictureId: chapter.pictureId,
      automaticTitle: chapter.title,
      automaticSubtitle: chapter.subtitle,
      title: edit?.title ?? chapter.title,
      subtitle: edit?.subtitle ?? chapter.subtitle,
      titleEdited: edit?.title !== undefined,
      subtitleEdited: edit?.subtitle !== undefined,
      hidden: edit?.hidden === true,
    };
  });
  const added: SlideshowChapter[] = (slideshow.addedChapters ?? []).map((chapter: AddedChapter) => {
    const automaticText = manualChapterText(slideshow, chapter.beforePictureId, locale);
    return {
      kind: "added",
      anchorPictureId: chapter.beforePictureId,
      automaticTitle: automaticText.title,
      automaticSubtitle: automaticText.subtitle,
      title: chapter.title ?? automaticText.title,
      subtitle: chapter.subtitle ?? automaticText.subtitle,
      titleEdited: chapter.title !== undefined,
      subtitleEdited: chapter.subtitle !== undefined,
      hidden: false,
    };
  });
  const order = new Map(slideshow.pictures.map((picture, index) => [picture.id, index]));
  return [...automatic, ...added].sort(
    (a, b) => (order.get(a.anchorPictureId) ?? 0) - (order.get(b.anchorPictureId) ?? 0),
  );
}

/** The non-hidden chapters' anchor and text, ready for the composer to insert as slides. */
export function composedChapters(
  slideshow: StoredSlideshow,
  locale: string,
): readonly {
  readonly anchorPictureId: string;
  readonly title: string;
  readonly subtitle: string;
}[] {
  return chaptersOfSlideshow(slideshow, locale)
    .filter((chapter) => !chapter.hidden)
    .map(({ anchorPictureId, title, subtitle }) => ({ anchorPictureId, title, subtitle }));
}
