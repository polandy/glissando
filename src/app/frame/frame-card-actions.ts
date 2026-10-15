import type { Translator } from "../i18n/translator";
import type { Toaster } from "../toast/toaster";
import type { FrameCardPreference } from "./frame-card-preference";

export interface HideFrameCardPorts {
  readonly preference: Pick<FrameCardPreference, "setShown">;
  readonly toaster: Pick<Toaster, "show">;
  readonly t: Translator["t"];
}

/** Hides the start screen's picture frame card; the toast says where it comes back and undoes it. */
export function hideFrameCard({ preference, toaster, t }: HideFrameCardPorts): void {
  preference.setShown(false);
  toaster.show({
    text: t("frame.cardHiddenToast"),
    tone: "info",
    action: { label: t("frame.cardUndo"), run: () => preference.setShown(true) },
  });
}
