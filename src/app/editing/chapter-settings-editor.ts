import {
  ChapterAlreadyAddedError,
  insertChapter as insertChapterEdit,
  removeAddedChapter as removeAddedChapterEdit,
  setAddedChapterSubtitle as setAddedChapterSubtitleEdit,
  setAddedChapterTitle as setAddedChapterTitleEdit,
  setAutomaticChaptersOff as setAutomaticChaptersOffEdit,
  setChapterHidden as setChapterHiddenEdit,
  setChapterSubtitle as setChapterSubtitleEdit,
  setChapterTitle as setChapterTitleEdit,
} from "../../library/slideshow-edits-chapters";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { normalizeCaption } from "../../player/caption";

/** A typed field, normalized by the caption rule; empty means "reset to automatic". */
function normalizedOrReset(typed: string): string | undefined {
  return normalizeCaption(typed);
}

/**
 * The slideshow's trip chapters (`TRIP_CHAPTERS.md`): the automatic-chapters switch, an
 * automatic chapter's own text and hidden state, and an added chapter's own text and removal.
 * Every edit stores at once, like a card's; a chapter offers no undo, only "Reset to automatic".
 */
export class ChapterSettingsEditor {
  readonly #current: () => StoredSlideshow;
  readonly #apply: (slideshow: StoredSlideshow) => void;

  constructor(current: () => StoredSlideshow, apply: (slideshow: StoredSlideshow) => void) {
    this.#current = current;
    this.#apply = apply;
  }

  setAutomaticChaptersOff(off: boolean): void {
    this.#apply(setAutomaticChaptersOffEdit(this.#current(), off));
  }

  /** Sets an automatic chapter's own title; an empty field resets it to the automatic text. */
  setChapterTitle(pictureId: string, typed: string): void {
    this.#apply(setChapterTitleEdit(this.#current(), pictureId, normalizedOrReset(typed)));
  }

  /** Sets an automatic chapter's own subtitle; an empty field resets it to the automatic text. */
  setChapterSubtitle(pictureId: string, typed: string): void {
    this.#apply(setChapterSubtitleEdit(this.#current(), pictureId, normalizedOrReset(typed)));
  }

  resetChapterTitle(pictureId: string): void {
    this.#apply(setChapterTitleEdit(this.#current(), pictureId, undefined));
  }

  resetChapterSubtitle(pictureId: string): void {
    this.#apply(setChapterSubtitleEdit(this.#current(), pictureId, undefined));
  }

  setChapterHidden(pictureId: string, hidden: boolean): void {
    this.#apply(setChapterHiddenEdit(this.#current(), pictureId, hidden));
  }

  /** Inserts an added chapter before the picture; already added before it, this does nothing. */
  insertChapter(beforePictureId: string): void {
    try {
      this.#apply(insertChapterEdit(this.#current(), beforePictureId));
    } catch (error) {
      if (!(error instanceof ChapterAlreadyAddedError)) {
        throw error;
      }
    }
  }

  removeAddedChapter(beforePictureId: string): void {
    this.#apply(removeAddedChapterEdit(this.#current(), beforePictureId));
  }

  setAddedChapterTitle(beforePictureId: string, typed: string): void {
    this.#apply(
      setAddedChapterTitleEdit(this.#current(), beforePictureId, normalizedOrReset(typed)),
    );
  }

  setAddedChapterSubtitle(beforePictureId: string, typed: string): void {
    this.#apply(
      setAddedChapterSubtitleEdit(this.#current(), beforePictureId, normalizedOrReset(typed)),
    );
  }

  resetAddedChapterTitle(beforePictureId: string): void {
    this.#apply(setAddedChapterTitleEdit(this.#current(), beforePictureId, undefined));
  }

  resetAddedChapterSubtitle(beforePictureId: string): void {
    this.#apply(setAddedChapterSubtitleEdit(this.#current(), beforePictureId, undefined));
  }
}
