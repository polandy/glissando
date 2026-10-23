import type { SlideshowDetails } from "../view-models";
import type { Translator } from "../../i18n/translator";
import { moodKenBurnsText, moodPictureTimesText, moodTransitionText } from "./mood-text";

/** The info panel's transition, picture times and Ken Burns rows, once a mood or the slideshow's own settings decide them. */
export interface InfoPanelMoodValues {
  readonly transitionValue: string;
  readonly transitionRowSummary: string;
  readonly pictureTimesValue: string;
  readonly kenBurnsValue: string;
}

/**
 * The transition, picture times and Ken Burns rows' displayed value, and the transition row's
 * summary: a mood's own text (ADR-0045) once one is set, else the slideshow's own automatic (or
 * own-count) text, as already shown before moods existed.
 */
export function infoPanelMoodValues(
  translator: Pick<Translator, "t" | "formatSeconds">,
  slideshow: SlideshowDetails,
  moodBpm: number | undefined,
  transitionSummary: string,
): InfoPanelMoodValues {
  const { t } = translator;
  if (slideshow.mood === undefined) {
    return {
      transitionValue: t(`effect.${slideshow.transition}`),
      transitionRowSummary: transitionSummary,
      pictureTimesValue:
        slideshow.ownDurationCount > 0
          ? t("slideshow.automaticWithOwn", { count: slideshow.ownDurationCount })
          : t("slideshow.automatic"),
      kenBurnsValue:
        slideshow.ownMotionCount > 0
          ? t("slideshow.automaticWithOwn", { count: slideshow.ownMotionCount })
          : t("slideshow.automatic"),
    };
  }
  return {
    transitionValue: moodTransitionText(t, slideshow.mood),
    transitionRowSummary: t("mood.byMood"),
    pictureTimesValue: moodPictureTimesText(translator, slideshow.mood, moodBpm),
    kenBurnsValue: moodKenBurnsText(t, slideshow.mood),
  };
}
