import type { PictureFocus } from "../../library/picture-focus";
import type { LibraryStore } from "../../library/library-store";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import type { Toaster } from "../toast/toaster";
import type { EditRefusal } from "./edit-refusal";

/** What the slideshow editor stores with, tells the user with and words its toasts with. */
export interface SlideshowEditorPorts {
  readonly store: Pick<LibraryStore, "updateSlideshow" | "claimMedia" | "releaseClaim">;
  /** The picture's focus as known now; the automatic motion aims at it. */
  readonly focusOf: (pictureId: string) => PictureFocus | undefined;
  readonly toaster: Pick<Toaster, "current" | "show" | "dismiss">;
  /** A new id for the claim that spares removed pictures' media while they can be undone. */
  readonly newId: () => string;
  readonly now: () => Date;
  readonly onError: (error: unknown) => void;
  /** The slideshow was deleted meanwhile, e.g. in another tab; edits are no longer stored. */
  readonly onGone: () => void;
  /** A server slideshow's edit was not applied; the editor shows the store's version. */
  readonly onRefused: (reason: EditRefusal) => void;
  /** The undo toast's text for `count` pictures removed. */
  readonly removedText: (count: number) => string;
  /** The undo toast's text for `count` pictures added. */
  readonly addedText: (count: number) => string;
  readonly undoLabel: () => string;
  /** Why the last picture stays, and how to discard the whole slideshow instead. */
  readonly lastPictureText: () => string;
  /** Why removing every picture of a selection is refused instead. */
  readonly everyPictureText: () => string;
  /** The undo toast's text after a picture's own motion was dropped. */
  readonly motionAutomaticText: () => string;
  /** The undo toast's text after a picture's own duration was dropped. */
  /** The undo toast's text after a picture's own transition was dropped. */
  /** The undo toast's text after a picture's own duration and transition were dropped together. */
  readonly timingAutomaticText: () => string;
  /** The undo toast's text after a picture's caption was cleared. */
  readonly captionClearedText: () => string;
  /** The undo toast's text after the slideshow's default transition went back to crossfade. */
  readonly slideshowTransitionResetText: () => string;
  /** The undo toast's text after the portrait pictures setting went back to automatic. */
  readonly portraitPicturesResetText: () => string;
  /** The undo toast's text after the slideshow's look went back to None. */
  readonly lookResetText: () => string;
  /** The undo toast's text after the slideshow's mood went back to Custom by the "Back to Custom" button. */
  readonly moodResetText: () => string;
  /**
   * The undo toast's text after a single setting's own edit (default transition, picture length
   * or seconds per picture) silently left an active mood, turning it to Custom (ADR-0045 `leaveMood`).
   */
  readonly moodNowCustomText: () => string;
  /** The undo toast's text after the title slide was removed. */
  readonly openingCardRemovedText: () => string;
  /** The undo toast's text after the closing slide was removed. */
  readonly closingCardRemovedText: () => string;
  /** The undo toast's text after an added chapter was deleted. */
  readonly chapterDeletedText: () => string;
  /** The undo toast's text after a chapter's title went back to automatic. */
  readonly chapterTitleResetText: () => string;
  /** The undo toast's text after a chapter's subtitle went back to automatic. */
  readonly chapterSubtitleResetText: () => string;
  /** The undo toast's text after a video clip's settings were reset. */
  readonly clipResetText: () => string;
  /** The undo toast's text after a song was removed. */
  readonly songRemovedText: () => string;
  /** The undo toast's text after `count` pictures were shuffled. */
  readonly shuffledText: (count: number) => string;
  /** Uniform in [0, 1); what a shuffle draws its order from. */
  readonly random: () => number;
  /** The title from the capture dates, which an emptied title falls back to. */
  readonly automaticTitle: (slideshow: StoredSlideshow) => string;
  /** The BCP 47 language the title slide's default subtitle (a capture range) is worded in. */
  readonly locale: () => string;
}
