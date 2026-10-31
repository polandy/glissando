import { titleForCaptureRange } from "../../compose";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { refusalToast, type EditRefusal } from "../editing/edit-refusal";
import { SlideshowEditor } from "../editing/slideshow-editor";
import type { SlideshowEditorPorts } from "../editing/slideshow-editor-ports";
import type { Translator } from "../i18n/translator";

/** What the slideshow route wires into its editor besides the copy. */
export type ScreenEditorPorts = Pick<
  SlideshowEditorPorts,
  "store" | "focusOf" | "toaster" | "newId" | "now" | "random" | "onError" | "onGone"
>;

/**
 * The slideshow screen's editor with its copy; a server slideshow's refused edit is told in a
 * toast (`dev-docs/server_library/IN_THE_APP.md`).
 */
export function createScreenEditor(
  initial: StoredSlideshow,
  ports: ScreenEditorPorts,
  translator: Translator,
): SlideshowEditor {
  const { t } = translator;
  const refused = (reason: EditRefusal): void =>
    ports.toaster.show(refusalToast(reason, translator));
  return new SlideshowEditor(initial, {
    ...ports,
    onRefused: refused,
    removedText: (count) => t("slideshow.removed", { count }),
    addedText: (count) => t("add.added", { count }),
    shuffledText: (count) => t("slideshow.shuffled", { count }),
    undoLabel: () => t("slideshow.undo"),
    lastPictureText: () => t("slideshow.lastPictureStays"),
    everyPictureText: () => t("slideshow.everyPictureStays"),
    motionAutomaticText: () => t("editor.motionAutomatic"),
    durationAutomaticText: () => t("editor.durationAutomatic"),
    transitionAutomaticText: () => t("editor.transitionAutomatic"),
    slideshowTransitionResetText: () => t("transitions.resetDone"),
    portraitPicturesResetText: () => t("portrait.resetDone"),
    lookResetText: () => t("look.resetDone"),
    moodResetText: () => t("mood.resetDone"),
    openingCardRemovedText: () => t("cards.openingRemoved"),
    closingCardRemovedText: () => t("cards.closingRemoved"),
    chapterDeletedText: () => t("chapters.deleted"),
    chapterTitleResetText: () => t("chapters.titleResetDone"),
    chapterSubtitleResetText: () => t("chapters.subtitleResetDone"),
    clipResetText: () => t("clip.resetDone"),
    moodNowCustomText: () => t("mood.nowCustom"),
    songRemovedText: () => t("music.songRemoved"),
    automaticTitle: (slideshow) =>
      titleForCaptureRange(
        slideshow.pictures.map((picture) => picture.capturedAt),
        translator.language,
      ),
    locale: () => translator.language,
  });
}
