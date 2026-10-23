import type { SlideshowChapter } from "../../../../compose/chapters-of-slideshow";
import type { ChapterSettingsEditor } from "../../../editing/chapter-settings-editor";

/**
 * The chapter sheet's field edits: an automatic chapter's own text edits by its picture id;
 * an added one's by the same id (the picture it anchors before), through a distinct pair of
 * `ChapterSettingsEditor` methods. Kept out of `ChapterSheet.svelte` to spare it the branching.
 */

export function setChapterTitle(
  editor: ChapterSettingsEditor | null,
  chapter: SlideshowChapter,
  typed: string,
): void {
  const id = chapter.anchorPictureId;
  if (chapter.kind === "automatic") {
    editor?.setChapterTitle(id, typed);
  } else {
    editor?.setAddedChapterTitle(id, typed);
  }
}

export function setChapterSubtitle(
  editor: ChapterSettingsEditor | null,
  chapter: SlideshowChapter,
  typed: string,
): void {
  const id = chapter.anchorPictureId;
  if (chapter.kind === "automatic") {
    editor?.setChapterSubtitle(id, typed);
  } else {
    editor?.setAddedChapterSubtitle(id, typed);
  }
}

export function resetChapterTitle(
  editor: ChapterSettingsEditor | null,
  chapter: SlideshowChapter,
): void {
  const id = chapter.anchorPictureId;
  if (chapter.kind === "automatic") {
    editor?.resetChapterTitle(id);
  } else {
    editor?.resetAddedChapterTitle(id);
  }
}

export function resetChapterSubtitle(
  editor: ChapterSettingsEditor | null,
  chapter: SlideshowChapter,
): void {
  const id = chapter.anchorPictureId;
  if (chapter.kind === "automatic") {
    editor?.resetChapterSubtitle(id);
  } else {
    editor?.resetAddedChapterSubtitle(id);
  }
}
