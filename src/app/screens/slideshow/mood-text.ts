import { moodPictureTimesValueText } from "../../mood-picture-times-value";
import type { SlideshowMood } from "../../../library/slideshow-mood";
import type { Translator } from "../../i18n/translator";

/**
 * The mood's display name, or Custom's; shown on the info panel row, the sheet's state pill and
 * tile names (MOOD.md).
 */
export function moodName(t: Translator["t"], mood: SlideshowMood | undefined): string {
  if (mood === undefined) {
    return t("mood.custom");
  }
  return mood === "calm" ? t("mood.calm") : t("mood.lively");
}

/**
 * "Picture times" worked out for `mood` at `beatsPerMinute` (MOOD.md): "~6.3 s · 8 beats" with a
 * tempo, "~7 s" without one; the slideshow's own automatic text while Custom.
 */
export function moodPictureTimesText(
  translator: Pick<Translator, "t" | "formatSeconds">,
  mood: SlideshowMood | undefined,
  beatsPerMinute: number | undefined,
): string {
  const { t } = translator;
  if (mood === undefined) {
    return t("slideshow.automatic");
  }
  return moodPictureTimesValueText(translator, mood, beatsPerMinute);
}

/** "Ken Burns" under a mood: "Gentle" (calm) or "Strong" (lively); automatic while Custom. */
export function moodKenBurnsText(t: Translator["t"], mood: SlideshowMood | undefined): string {
  if (mood === undefined) {
    return t("slideshow.automatic");
  }
  return mood === "calm" ? t("mood.kenBurnsGentle") : t("mood.kenBurnsStrong");
}

/**
 * The mood's transition, named "{name}, long" (calm, "Crossfade") or "{name}, short" (lively,
 * "Mixed" — MOOD.md's own word for this summary line, apart from the Transitions sheet's
 * "Alternating" tile label); "standard" while Custom, since no one mood sets it there. The
 * transition itself does not depend on the tempo, so no `beatsPerMinute` is taken.
 */
export function moodTransitionText(t: Translator["t"], mood: SlideshowMood | undefined): string {
  if (mood === undefined) {
    return t("mood.transitionStandard");
  }
  return mood === "calm"
    ? t("mood.transitionLong", { name: t("effect.crossfade") })
    : t("mood.transitionShort", { name: t("mood.transitionMixedName") });
}
