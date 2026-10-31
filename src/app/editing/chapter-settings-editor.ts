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
import type { AddedChapter, StoredSlideshow } from "../../library/stored-slideshow";
import { normalizeCaption } from "../../player/caption";
import type { ResetUndo } from "./reset-undo";

/** What `ChapterSettingsEditor` needs from the screen to word its undo toasts. */
export interface ChapterSettingsPorts {
  /** The undo toast's text after an added chapter was deleted. */
  readonly chapterDeletedText: () => string;
  /** The undo toast's text after a chapter's title went back to automatic. */
  readonly chapterTitleResetText: () => string;
  /** The undo toast's text after a chapter's subtitle went back to automatic. */
  readonly chapterSubtitleResetText: () => string;
}

/** The undo's owner id of an added chapter, apart from an automatic chapter's picture id. */
function addedOwner(beforePictureId: string): string {
  return `added:${beforePictureId}`;
}

/** A typed field, normalized by the caption rule; empty means "reset to automatic". */
function normalizedOrReset(typed: string): string | undefined {
  return normalizeCaption(typed);
}

/**
 * The slideshow's trip chapters (`TRIP_CHAPTERS.md`): the automatic-chapters switch, an
 * automatic chapter's own text and hidden state, and an added chapter's own text and removal.
 * Every edit stores at once, like a card's; deleting an added chapter and resetting a title or
 * subtitle to automatic offer an undo in their toast (`ResetUndo`).
 */
export class ChapterSettingsEditor {
  readonly #ports: ChapterSettingsPorts;
  readonly #reset: ResetUndo;
  readonly #current: () => StoredSlideshow;
  readonly #apply: (slideshow: StoredSlideshow) => void;

  constructor(
    ports: ChapterSettingsPorts,
    reset: ResetUndo,
    current: () => StoredSlideshow,
    apply: (slideshow: StoredSlideshow) => void,
  ) {
    this.#ports = ports;
    this.#reset = reset;
    this.#current = current;
    this.#apply = apply;
  }

  setAutomaticChaptersOff(off: boolean): void {
    this.#apply(setAutomaticChaptersOffEdit(this.#current(), off));
  }

  /** Sets an automatic chapter's own title; an empty field resets it to the automatic text. */
  setChapterTitle(pictureId: string, typed: string): void {
    this.#reset.supersede(pictureId, "chapterTitle");
    this.#apply(setChapterTitleEdit(this.#current(), pictureId, normalizedOrReset(typed)));
  }

  /** Sets an automatic chapter's own subtitle; an empty field resets it to the automatic text. */
  setChapterSubtitle(pictureId: string, typed: string): void {
    this.#reset.supersede(pictureId, "chapterSubtitle");
    this.#apply(setChapterSubtitleEdit(this.#current(), pictureId, normalizedOrReset(typed)));
  }

  resetChapterTitle(pictureId: string): void {
    const previous = this.#current().chapterEdits?.find((e) => e.pictureId === pictureId)?.title;
    this.#apply(setChapterTitleEdit(this.#current(), pictureId, undefined));
    this.#offerRestore(
      pictureId,
      "chapterTitle",
      previous,
      this.#ports.chapterTitleResetText(),
      () => this.setChapterTitle(pictureId, previous ?? ""),
    );
  }

  resetChapterSubtitle(pictureId: string): void {
    const previous = this.#current().chapterEdits?.find((e) => e.pictureId === pictureId)?.subtitle;
    this.#apply(setChapterSubtitleEdit(this.#current(), pictureId, undefined));
    this.#offerRestore(
      pictureId,
      "chapterSubtitle",
      previous,
      this.#ports.chapterSubtitleResetText(),
      () => this.setChapterSubtitle(pictureId, previous ?? ""),
    );
  }

  setChapterHidden(pictureId: string, hidden: boolean): void {
    this.#apply(setChapterHiddenEdit(this.#current(), pictureId, hidden));
  }

  /** Inserts an added chapter before the picture; already added before it, this does nothing. */
  insertChapter(beforePictureId: string): void {
    this.#reset.supersede(addedOwner(beforePictureId), "addedChapter");
    try {
      this.#apply(insertChapterEdit(this.#current(), beforePictureId));
    } catch (error) {
      if (!(error instanceof ChapterAlreadyAddedError)) {
        throw error;
      }
    }
  }

  /** Deletes an added chapter; the toast's undo brings it back with its title and subtitle. */
  removeAddedChapter(beforePictureId: string): void {
    const previous = this.#addedChapter(beforePictureId);
    this.#apply(removeAddedChapterEdit(this.#current(), beforePictureId));
    if (previous === undefined) {
      return;
    }
    this.#reset.offer(
      addedOwner(beforePictureId),
      "addedChapter",
      this.#ports.chapterDeletedText(),
      () => this.#restoreAddedChapter(previous),
    );
  }

  setAddedChapterTitle(beforePictureId: string, typed: string): void {
    this.#reset.supersede(addedOwner(beforePictureId), "chapterTitle");
    this.#apply(
      setAddedChapterTitleEdit(this.#current(), beforePictureId, normalizedOrReset(typed)),
    );
  }

  setAddedChapterSubtitle(beforePictureId: string, typed: string): void {
    this.#reset.supersede(addedOwner(beforePictureId), "chapterSubtitle");
    this.#apply(
      setAddedChapterSubtitleEdit(this.#current(), beforePictureId, normalizedOrReset(typed)),
    );
  }

  resetAddedChapterTitle(beforePictureId: string): void {
    const previous = this.#addedChapter(beforePictureId)?.title;
    this.#apply(setAddedChapterTitleEdit(this.#current(), beforePictureId, undefined));
    this.#offerRestore(
      addedOwner(beforePictureId),
      "chapterTitle",
      previous,
      this.#ports.chapterTitleResetText(),
      () => this.setAddedChapterTitle(beforePictureId, previous ?? ""),
    );
  }

  resetAddedChapterSubtitle(beforePictureId: string): void {
    const previous = this.#addedChapter(beforePictureId)?.subtitle;
    this.#apply(setAddedChapterSubtitleEdit(this.#current(), beforePictureId, undefined));
    this.#offerRestore(
      addedOwner(beforePictureId),
      "chapterSubtitle",
      previous,
      this.#ports.chapterSubtitleResetText(),
      () => this.setAddedChapterSubtitle(beforePictureId, previous ?? ""),
    );
  }

  #addedChapter(beforePictureId: string): AddedChapter | undefined {
    return this.#current().addedChapters?.find((c) => c.beforePictureId === beforePictureId);
  }

  /** Offers the undo only when a text was dropped; nothing to bring back otherwise. */
  #offerRestore(
    ownerId: string,
    setting: "chapterTitle" | "chapterSubtitle",
    previous: string | undefined,
    text: string,
    restore: () => void,
  ): void {
    if (previous !== undefined) {
      this.#reset.offer(ownerId, setting, text, restore);
    }
  }

  #restoreAddedChapter(chapter: AddedChapter): void {
    const id = chapter.beforePictureId;
    this.insertChapter(id);
    if (chapter.title !== undefined) {
      this.setAddedChapterTitle(id, chapter.title);
    }
    if (chapter.subtitle !== undefined) {
      this.setAddedChapterSubtitle(id, chapter.subtitle);
    }
  }
}
