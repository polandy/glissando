import { checkChapterText, InvalidChapterError } from "../library/stored-chapters";
import type { AddedChapter, ChapterEdit } from "../library/stored-slideshow";
import { DocumentFormatError, readObject } from "./document-values";

/**
 * A chapter edit or an added chapter in a document (.glissando manifest, share answer): the same
 * fields as `ChapterEdit`/`AddedChapter`, but the picture they anchor to named by its position
 * among the document's pictures (`pictureIndex`/`beforePictureIndex`), since neither document
 * gives a picture a stable id of its own (ADR-0032).
 */

export interface ManifestChapterEdit {
  readonly pictureIndex: number;
  readonly title?: string;
  readonly subtitle?: string;
  readonly hidden?: true;
}

export interface ManifestAddedChapter {
  readonly beforePictureIndex: number;
  readonly title?: string;
  readonly subtitle?: string;
}

/** `edits`' pictures named by their index in `pictureIds`; `undefined` stays so. */
export function chapterEditsToManifest(
  edits: readonly ChapterEdit[] | undefined,
  pictureIds: readonly string[],
): readonly ManifestChapterEdit[] | undefined {
  if (edits === undefined) {
    return undefined;
  }
  return edits.map((edit) => ({
    pictureIndex: indexOfPicture(edit.pictureId, pictureIds, "chapter edit"),
    ...(edit.title === undefined ? {} : { title: edit.title }),
    ...(edit.subtitle === undefined ? {} : { subtitle: edit.subtitle }),
    ...(edit.hidden === undefined ? {} : { hidden: edit.hidden }),
  }));
}

/** `chapters`' pictures named by their index in `pictureIds`; `undefined` stays so. */
export function addedChaptersToManifest(
  chapters: readonly AddedChapter[] | undefined,
  pictureIds: readonly string[],
): readonly ManifestAddedChapter[] | undefined {
  if (chapters === undefined) {
    return undefined;
  }
  return chapters.map((chapter) => ({
    beforePictureIndex: indexOfPicture(chapter.beforePictureId, pictureIds, "added chapter"),
    ...(chapter.title === undefined ? {} : { title: chapter.title }),
    ...(chapter.subtitle === undefined ? {} : { subtitle: chapter.subtitle }),
  }));
}

function indexOfPicture(pictureId: string, pictureIds: readonly string[], what: string): number {
  const index = pictureIds.indexOf(pictureId);
  if (index < 0) {
    throw new Error(`${what} names picture "${pictureId}", not one of this slideshow's`);
  }
  return index;
}

/** `edits`' pictures named by `pictureIds[pictureIndex]`; `undefined` stays so. */
export function chapterEditsFromManifest(
  edits: readonly ManifestChapterEdit[] | undefined,
  pictureIds: readonly string[],
): readonly ChapterEdit[] | undefined {
  if (edits === undefined) {
    return undefined;
  }
  return edits.map((edit) => ({
    pictureId: pictureAt(edit.pictureIndex, pictureIds, "chapter edit"),
    ...(edit.title === undefined ? {} : { title: edit.title }),
    ...(edit.subtitle === undefined ? {} : { subtitle: edit.subtitle }),
    ...(edit.hidden === undefined ? {} : { hidden: edit.hidden }),
  }));
}

/** `chapters`' pictures named by `pictureIds[beforePictureIndex]`; `undefined` stays so. */
export function addedChaptersFromManifest(
  chapters: readonly ManifestAddedChapter[] | undefined,
  pictureIds: readonly string[],
): readonly AddedChapter[] | undefined {
  if (chapters === undefined) {
    return undefined;
  }
  return chapters.map((chapter) => ({
    beforePictureId: pictureAt(chapter.beforePictureIndex, pictureIds, "added chapter"),
    ...(chapter.title === undefined ? {} : { title: chapter.title }),
    ...(chapter.subtitle === undefined ? {} : { subtitle: chapter.subtitle }),
  }));
}

function pictureAt(index: number, pictureIds: readonly string[], what: string): string {
  const pictureId = pictureIds[index];
  if (pictureId === undefined) {
    throw new Error(`${what}'s pictureIndex ${index} is out of range`);
  }
  return pictureId;
}

/** `value` as `StoredSlideshow.chapterEdits`, manifest-shaped; throws `DocumentFormatError`. */
export function readManifestChapterEdits(
  value: unknown,
  path: string,
  pictureCount: number,
): readonly ManifestChapterEdit[] {
  const edits = readArray(value, path).map((item, index) =>
    readManifestChapterEdit(item, `${path}[${index}]`, pictureCount),
  );
  refuseRepeatedIndex(
    edits.map((edit) => edit.pictureIndex),
    path,
    "pictureIndex",
  );
  return edits;
}

/** `value` as `StoredSlideshow.addedChapters`, manifest-shaped; throws `DocumentFormatError`. */
export function readManifestAddedChapters(
  value: unknown,
  path: string,
  pictureCount: number,
): readonly ManifestAddedChapter[] {
  const chapters = readArray(value, path).map((item, index) =>
    readManifestAddedChapter(item, `${path}[${index}]`, pictureCount),
  );
  refuseRepeatedIndex(
    chapters.map((chapter) => chapter.beforePictureIndex),
    path,
    "beforePictureIndex",
  );
  return chapters;
}

function readManifestChapterEdit(
  value: unknown,
  path: string,
  pictureCount: number,
): ManifestChapterEdit {
  const edit = readObject(value, path, ["pictureIndex", "title", "subtitle", "hidden"]);
  const pictureIndex = readPictureIndex(edit["pictureIndex"], path, "pictureIndex", pictureCount);
  const hidden = readHidden(edit["hidden"], path);
  return {
    pictureIndex,
    ...readTextOverrides(edit, path),
    ...(hidden === undefined ? {} : { hidden }),
  };
}

function readManifestAddedChapter(
  value: unknown,
  path: string,
  pictureCount: number,
): ManifestAddedChapter {
  const chapter = readObject(value, path, ["beforePictureIndex", "title", "subtitle"]);
  const beforePictureIndex = readPictureIndex(
    chapter["beforePictureIndex"],
    path,
    "beforePictureIndex",
    pictureCount,
  );
  return { beforePictureIndex, ...readTextOverrides(chapter, path) };
}

function readHidden(value: unknown, path: string): true | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value !== true) {
    throw new DocumentFormatError(`${path}.hidden`, "true or absent", value);
  }
  return true;
}

function readTextOverrides(
  value: Readonly<Record<string, unknown>>,
  path: string,
): { title?: string; subtitle?: string } {
  const title =
    value["title"] === undefined ? undefined : readChapterText(value["title"], path, "title");
  const subtitle =
    value["subtitle"] === undefined
      ? undefined
      : readChapterText(value["subtitle"], path, "subtitle");
  return {
    ...(title === undefined ? {} : { title }),
    ...(subtitle === undefined ? {} : { subtitle }),
  };
}

function readArray(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new DocumentFormatError(path, "an array", value);
  }
  return value;
}

function refuseRepeatedIndex(indices: readonly number[], path: string, field: string): void {
  const seen = new Set<number>();
  for (const index of indices) {
    if (seen.has(index)) {
      throw new DocumentFormatError(`${path}.${field}`, "each picture named at most once", index);
    }
    seen.add(index);
  }
}

function readPictureIndex(
  value: unknown,
  path: string,
  field: string,
  pictureCount: number,
): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value >= pictureCount) {
    throw new DocumentFormatError(
      `${path}.${field}`,
      `a whole number from 0 to ${pictureCount - 1}`,
      value,
    );
  }
  return value;
}

function readChapterText(value: unknown, path: string, field: "title" | "subtitle"): string {
  try {
    return checkChapterText(value, path, field);
  } catch (error) {
    if (error instanceof InvalidChapterError) {
      throw new DocumentFormatError(`${path}.${error.field}`, error.expected, error.actual);
    }
    throw error;
  }
}
