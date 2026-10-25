import type { SlideshowDetails } from "../view-models";
import type { Translator } from "../../i18n/translator";
import { energyPictureTimesRangeText } from "./energy-pacing-text";
import { moodKenBurnsText, moodPictureTimesText, moodTransitionText } from "./mood-text";
import type { MoodEnergyPacing } from "./mood-energy-pacing";

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
 * own-count) text. Under a mood with the energy pacing on (ADR-0046), "Picture times" shows the
 * found range instead; under Custom it keeps its value, the switch row below says it is on.
 */
export function infoPanelMoodValues(
  translator: Pick<Translator, "t" | "formatSeconds">,
  slideshow: SlideshowDetails,
  moodBpm: number | undefined,
  transitionSummary: string,
  energyPacing: MoodEnergyPacing | null,
): InfoPanelMoodValues {
  const { t } = translator;
  const energyRangeFound =
    energyPacing !== null && energyPacing.maxMs > energyPacing.minMs
      ? energyPictureTimesRangeText(translator, energyPacing.minMs, energyPacing.maxMs)
      : null;
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
    pictureTimesValue:
      energyRangeFound ?? moodPictureTimesText(translator, slideshow.mood, moodBpm),
    kenBurnsValue: moodKenBurnsText(t, slideshow.mood),
  };
}
