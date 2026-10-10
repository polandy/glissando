import type { PictureFocus } from "../../library/picture-focus";
import type { LibraryStore, StoredSlideshow } from "../../library/stored-slideshow";
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
  readonly durationAutomaticText: () => string;
  /** The undo toast's text after a picture's own transition was dropped. */
  readonly transitionAutomaticText: () => string;
  /** The undo toast's text after the slideshow's default transition went back to crossfade. */
  readonly slideshowTransitionResetText: () => string;
  /** The title from the capture dates, which an emptied title falls back to. */
  readonly automaticTitle: (slideshow: StoredSlideshow) => string;
}
