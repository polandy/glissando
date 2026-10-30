import type { SlideshowDetails } from "../view-models";
import type { Translator } from "../../i18n/translator";
import { moodTransitionText } from "./mood-text";

/** The Fine settings fold's Transitions row (ADR-0048), once a mood or the slideshow's own
 * settings decide it. */
export interface MoodTransitionValue {
  readonly transitionValue: string;
  readonly transitionRowSummary: string;
}

/**
 * The Transitions row's displayed value and summary: a mood's own text (ADR-0045) once one is
 * set, with "by mood" as the summary; else the slideshow's own transition and `transitionSummary`.
 */
export function moodTransitionValue(
  t: Translator["t"],
  slideshow: Pick<SlideshowDetails, "mood" | "transition">,
  transitionSummary: string,
): MoodTransitionValue {
  if (slideshow.mood === undefined) {
    return {
      transitionValue: t(`effect.${slideshow.transition}`),
      transitionRowSummary: transitionSummary,
    };
  }
  return {
    transitionValue: moodTransitionText(t, slideshow.mood),
    transitionRowSummary: t("mood.byMood"),
  };
}
