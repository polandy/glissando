import { chaptersWithoutPictures, checkChapterText, InvalidChapterError } from "./stored-chapters";
import type { AddedChapter, ChapterEdit, StoredPicture, StoredSlideshow } from "./stored-slideshow";

/**
 * The editing of a slideshow's chapters (Rule E, `TRIP_CHAPTERS.md`): turn automatic chapters on
 * or off, edit or reset an automatic chapter's own text, hide or unhide one, and insert, edit or
 * remove an added chapter; move one off a picture that leaves the slideshow. Pure functions over
 * the stored record; the caller stores the result.
 */

type MutableSlideshow = { -readonly [Key in keyof StoredSlideshow]: StoredSlideshow[Key] };

function pictureIdsOf(slideshow: StoredSlideshow): ReadonlySet<string> {
  return new Set(slideshow.pictures.map((picture) => picture.id));
}

function checkAnchorPicture(slideshow: StoredSlideshow, pictureId: string, field: string): void {
  if (!pictureIdsOf(slideshow).has(pictureId)) {
    throw new InvalidChapterError(
      `slideshow "${slideshow.id}"`,
      field,
      "a picture in this slideshow",
      pictureId,
    );
  }
}

function checkedText(
  slideshow: StoredSlideshow,
  value: string | undefined,
  field: "title" | "subtitle",
): string | undefined {
  return value === undefined
    ? undefined
    : checkChapterText(value, `slideshow "${slideshow.id}"`, field);
}

/** Turns automatic chapters (Rule C) on or off for this slideshow; on is the default. */
export function setAutomaticChaptersOff(slideshow: StoredSlideshow, off: boolean): StoredSlideshow {
  const next: MutableSlideshow = { ...slideshow };
  delete next.automaticChaptersOff;
  return off ? { ...next, automaticChaptersOff: true } : next;
}

/** `pictureId`, `title`, `subtitle` and `hidden`, dropping any left `undefined`; `undefined` once
 *  all three are, since an edit with nothing overridden is no edit at all. */
function chapterEditFrom(
  pictureId: string,
  title: string | undefined,
  subtitle: string | undefined,
  hidden: true | undefined,
): ChapterEdit | undefined {
  if (title === undefined && subtitle === undefined && hidden === undefined) {
    return undefined;
  }
  return {
    pictureId,
    ...(title === undefined ? {} : { title }),
    ...(subtitle === undefined ? {} : { subtitle }),
    ...(hidden === undefined ? {} : { hidden }),
  };
}

function withChapterEdit(
  slideshow: StoredSlideshow,
  pictureId: string,
  change: (existing: ChapterEdit | undefined) => ChapterEdit | undefined,
): StoredSlideshow {
  const edits = slideshow.chapterEdits ?? [];
  const changed = change(edits.find((edit) => edit.pictureId === pictureId));
  const withoutIt = edits.filter((edit) => edit.pictureId !== pictureId);
  const edited = changed === undefined ? withoutIt : [...withoutIt, changed];
  const next: MutableSlideshow = { ...slideshow };
  if (edited.length === 0) {
    delete next.chapterEdits;
  } else {
    next.chapterEdits = edited;
  }
  return next;
}

/** Sets an automatic chapter's own title; `undefined` resets it to the automatic text. */
export function setChapterTitle(
  slideshow: StoredSlideshow,
  pictureId: string,
  title: string | undefined,
): StoredSlideshow {
  checkAnchorPicture(slideshow, pictureId, "pictureId");
  const checked = checkedText(slideshow, title, "title");
  return withChapterEdit(slideshow, pictureId, (existing) =>
    chapterEditFrom(pictureId, checked, existing?.subtitle, existing?.hidden),
  );
}

/** Sets an automatic chapter's own subtitle; `undefined` resets it to the automatic text. */
export function setChapterSubtitle(
  slideshow: StoredSlideshow,
  pictureId: string,
  subtitle: string | undefined,
): StoredSlideshow {
  checkAnchorPicture(slideshow, pictureId, "pictureId");
  const checked = checkedText(slideshow, subtitle, "subtitle");
  return withChapterEdit(slideshow, pictureId, (existing) =>
    chapterEditFrom(pictureId, existing?.title, checked, existing?.hidden),
  );
}

/** Hides or unhides an automatic chapter; its picture still plays, the chapter just has no slide. */
export function setChapterHidden(
  slideshow: StoredSlideshow,
  pictureId: string,
  hidden: boolean,
): StoredSlideshow {
  checkAnchorPicture(slideshow, pictureId, "pictureId");
  return withChapterEdit(slideshow, pictureId, (existing) =>
    chapterEditFrom(pictureId, existing?.title, existing?.subtitle, hidden ? true : undefined),
  );
}

function withAddedChapter(
  slideshow: StoredSlideshow,
  beforePictureId: string,
  change: (existing: AddedChapter | undefined) => AddedChapter | undefined,
): StoredSlideshow {
  const added = slideshow.addedChapters ?? [];
  const changed = change(added.find((chapter) => chapter.beforePictureId === beforePictureId));
  const withoutIt = added.filter((chapter) => chapter.beforePictureId !== beforePictureId);
  const edited = changed === undefined ? withoutIt : [...withoutIt, changed];
  const next: MutableSlideshow = { ...slideshow };
  if (edited.length === 0) {
    delete next.addedChapters;
  } else {
    next.addedChapters = edited;
  }
  return next;
}

/** A chapter was already added before this picture. */
export class ChapterAlreadyAddedError extends Error {
  constructor(readonly beforePictureId: string) {
    super(`a chapter is already added before picture "${beforePictureId}"`);
    this.name = "ChapterAlreadyAddedError";
  }
}

/** Inserts a manual chapter before `beforePictureId`, with automatic text until edited. */
export function insertChapter(
  slideshow: StoredSlideshow,
  beforePictureId: string,
): StoredSlideshow {
  checkAnchorPicture(slideshow, beforePictureId, "beforePictureId");
  if (
    (slideshow.addedChapters ?? []).some((chapter) => chapter.beforePictureId === beforePictureId)
  ) {
    throw new ChapterAlreadyAddedError(beforePictureId);
  }
  return withAddedChapter(slideshow, beforePictureId, () => ({ beforePictureId }));
}

/** Removes a manually added chapter; an automatic chapter is hidden instead, never deleted. */
export function removeAddedChapter(
  slideshow: StoredSlideshow,
  beforePictureId: string,
): StoredSlideshow {
  return withAddedChapter(slideshow, beforePictureId, () => undefined);
}

function existingAddedChapter(slideshow: StoredSlideshow, beforePictureId: string): AddedChapter {
  const existing = (slideshow.addedChapters ?? []).find(
    (chapter) => chapter.beforePictureId === beforePictureId,
  );
  if (existing === undefined) {
    throw new InvalidChapterError(
      `slideshow "${slideshow.id}"`,
      "beforePictureId",
      "an added chapter",
      beforePictureId,
    );
  }
  return existing;
}

/** Sets an added chapter's own title; `undefined` resets it to the automatic text. */
export function setAddedChapterTitle(
  slideshow: StoredSlideshow,
  beforePictureId: string,
  title: string | undefined,
): StoredSlideshow {
  const existing = existingAddedChapter(slideshow, beforePictureId);
  const checked = checkedText(slideshow, title, "title");
  return withAddedChapter(slideshow, beforePictureId, () => ({
    beforePictureId,
    ...(checked === undefined ? {} : { title: checked }),
    ...(existing.subtitle === undefined ? {} : { subtitle: existing.subtitle }),
  }));
}

/** Sets an added chapter's own subtitle; `undefined` resets it to the automatic text. */
export function setAddedChapterSubtitle(
  slideshow: StoredSlideshow,
  beforePictureId: string,
  subtitle: string | undefined,
): StoredSlideshow {
  const existing = existingAddedChapter(slideshow, beforePictureId);
  const checked = checkedText(slideshow, subtitle, "subtitle");
  return withAddedChapter(slideshow, beforePictureId, () => ({
    beforePictureId,
    ...(existing.title === undefined ? {} : { title: existing.title }),
    ...(checked === undefined ? {} : { subtitle: checked }),
  }));
}

/**
 * `slideshow` with `pictures` in place of its own, dropping a chapter edit or added chapter
 * anchored to one of `removedPictureIds` outright — a chapter has no fallback picture to move to.
 */
export function withPicturesAfterChapterRemoval(
  slideshow: StoredSlideshow,
  pictures: readonly StoredPicture[],
  removedPictureIds: ReadonlySet<string>,
): StoredSlideshow {
  const { chapterEdits, addedChapters } = chaptersWithoutPictures(
    slideshow.chapterEdits,
    slideshow.addedChapters,
    removedPictureIds,
  );
  const next: MutableSlideshow = { ...slideshow, pictures };
  if (chapterEdits === undefined) {
    delete next.chapterEdits;
  } else {
    next.chapterEdits = chapterEdits;
  }
  if (addedChapters === undefined) {
    delete next.addedChapters;
  } else {
    next.addedChapters = addedChapters;
  }
  return next;
}
