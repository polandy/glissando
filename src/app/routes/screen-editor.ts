import { titleForCaptureRange } from "../../compose";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import type { EditRefusal } from "../editing/edit-saver";
import { SlideshowEditor, type SlideshowEditorPorts } from "../editing/slideshow-editor";
import type { Translator } from "../i18n/translator";

/** What the slideshow route wires into its editor besides the copy. */
export type ScreenEditorPorts = Pick<
  SlideshowEditorPorts,
  "store" | "focusOf" | "toaster" | "newId" | "now" | "onError" | "onGone"
>;

/**
 * The slideshow screen's editor with its copy; a server slideshow's refused edit is told in a
 * toast (`dev-docs/SERVER_LIBRARY.md`, A server slideshow's screen).
 */
export function createScreenEditor(
  initial: StoredSlideshow,
  ports: ScreenEditorPorts,
  translator: Translator,
): SlideshowEditor {
  const { t } = translator;
  const refused = (reason: EditRefusal): void => {
    ports.toaster.show(
      reason === "changed"
        ? { text: t("server.changedElsewhere"), tone: "info" }
        : { text: t("server.saveFailed"), tone: "error" },
    );
  };
  return new SlideshowEditor(initial, {
    ...ports,
    onRefused: refused,
    removedText: (count) => t("slideshow.removed", { count }),
    addedText: (count) => t("add.added", { count }),
    undoLabel: () => t("slideshow.undo"),
    lastPictureText: () => t("slideshow.lastPictureStays"),
    motionAutomaticText: () => t("editor.motionAutomatic"),
    durationAutomaticText: () => t("editor.durationAutomatic"),
    transitionAutomaticText: () => t("editor.transitionAutomatic"),
    slideshowTransitionResetText: () => t("transitions.resetDone"),
    automaticTitle: (slideshow) =>
      titleForCaptureRange(
        slideshow.pictures.map((picture) => picture.capturedAt),
        translator.language,
      ),
  });
}
