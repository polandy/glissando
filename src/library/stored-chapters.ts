import { CAPTION_RULE, isCaption } from "../player/caption";
import type { AddedChapter, ChapterEdit } from "./stored-slideshow";

/**
 * A chapter's own rules (Rule E, `TRIP_CHAPTERS.md`): its title and subtitle follow the caption
 * rule, with no "or empty" exception — unlike a card's text, an empty chapter title or subtitle
 * is a validation error, not "not shown".
 */

export class InvalidChapterError extends Error {
  constructor(
    where: string,
    readonly field: string,
    readonly expected: string,
    readonly actual: unknown,
  ) {
    super(`${where} ${field}: expected ${expected}, got ${JSON.stringify(actual)}`);
    this.name = "InvalidChapterError";
  }
}

/** `value` as a chapter's title or subtitle; throws `InvalidChapterError` naming `where`. */
export function checkChapterText(
  value: unknown,
  where: string,
  field: "title" | "subtitle",
): string {
  if (isCaption(value)) {
    return value;
  }
  throw new InvalidChapterError(where, field, CAPTION_RULE, value);
}

function checkHidden(value: unknown, where: string): true | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === true) {
    return true;
  }
  throw new InvalidChapterError(where, "hidden", "true or absent", value);
}

function checkChapterPictureId(
  value: unknown,
  pictureIds: ReadonlySet<string>,
  where: string,
  field: string,
): string {
  if (typeof value === "string" && pictureIds.has(value)) {
    return value;
  }
  throw new InvalidChapterError(where, field, "a picture in this slideshow", value);
}

function checkTextOverrides(
  input: { readonly title?: unknown; readonly subtitle?: unknown },
  where: string,
): { title?: string; subtitle?: string } {
  const title =
    input.title === undefined ? undefined : checkChapterText(input.title, where, "title");
  const subtitle =
    input.subtitle === undefined ? undefined : checkChapterText(input.subtitle, where, "subtitle");
  return {
    ...(title === undefined ? {} : { title }),
    ...(subtitle === undefined ? {} : { subtitle }),
  };
}

/** What `checkChapterEdits` accepts: the same shape as `ChapterEdit`, every field unchecked. */
export interface ChapterEditInput {
  readonly pictureId: unknown;
  readonly title?: unknown;
  readonly subtitle?: unknown;
  readonly hidden?: unknown;
}

/**
 * `inputs` as `StoredSlideshow.chapterEdits`: each names one of `pictureIds`, at most once;
 * throws `InvalidChapterError` for an unknown picture, a duplicate, or invalid text.
 */
export function checkChapterEdits(
  inputs: readonly ChapterEditInput[],
  pictureIds: ReadonlySet<string>,
  where: string,
): readonly ChapterEdit[] {
  const seen = new Set<string>();
  return inputs.map((input) => {
    const pictureId = checkChapterPictureId(input.pictureId, pictureIds, where, "pictureId");
    if (seen.has(pictureId)) {
      throw new InvalidChapterError(
        where,
        "pictureId",
        "each picture named at most once",
        pictureId,
      );
    }
    seen.add(pictureId);
    const hidden = checkHidden(input.hidden, where);
    return {
      pictureId,
      ...checkTextOverrides(input, where),
      ...(hidden === undefined ? {} : { hidden }),
    };
  });
}

/** What `checkAddedChapters` accepts: the same shape as `AddedChapter`, every field unchecked. */
export interface AddedChapterInput {
  readonly beforePictureId: unknown;
  readonly title?: unknown;
  readonly subtitle?: unknown;
}

/**
 * `inputs` as `StoredSlideshow.addedChapters`: each names one of `pictureIds` to go before, at
 * most once; throws `InvalidChapterError` for an unknown picture, a duplicate, or invalid text.
 */
export function checkAddedChapters(
  inputs: readonly AddedChapterInput[],
  pictureIds: ReadonlySet<string>,
  where: string,
): readonly AddedChapter[] {
  const seen = new Set<string>();
  return inputs.map((input) => {
    const beforePictureId = checkChapterPictureId(
      input.beforePictureId,
      pictureIds,
      where,
      "beforePictureId",
    );
    if (seen.has(beforePictureId)) {
      throw new InvalidChapterError(
        where,
        "beforePictureId",
        "each picture named at most once",
        beforePictureId,
      );
    }
    seen.add(beforePictureId);
    return { beforePictureId, ...checkTextOverrides(input, where) };
  });
}

/**
 * `chapterEdits`/`addedChapters` once every picture in `removedPictureIds` leaves the slideshow:
 * an edit or an added chapter anchored to one of them is dropped outright, since a chapter has
 * no fallback picture to move to the way a card's background does.
 */
export function chaptersWithoutPictures(
  chapterEdits: readonly ChapterEdit[] | undefined,
  addedChapters: readonly AddedChapter[] | undefined,
  removedPictureIds: ReadonlySet<string>,
): { chapterEdits?: readonly ChapterEdit[]; addedChapters?: readonly AddedChapter[] } {
  const edits = (chapterEdits ?? []).filter((edit) => !removedPictureIds.has(edit.pictureId));
  const added = (addedChapters ?? []).filter(
    (chapter) => !removedPictureIds.has(chapter.beforePictureId),
  );
  return {
    ...(edits.length === 0 ? {} : { chapterEdits: edits }),
    ...(added.length === 0 ? {} : { addedChapters: added }),
  };
}
