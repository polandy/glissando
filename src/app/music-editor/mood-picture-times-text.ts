import { moodPictureTimesValueText } from "../mood-picture-times-value";
import type { SlideshowMood } from "../../library/slideshow-mood";
import type { Translator } from "../i18n/translator";

/**
 * The music editor's picture-length row while the slideshow's mood sets it (MOOD.md): "Picture
 * times are set by the mood Calm — ~6.3 s · 8 beats" (or "~7 s" without a tempo). The value comes
 * from `moodPictureTimesValueText`, shared with the slideshow screen's own mood text
 * (`mood-text.ts`), so it reads the same everywhere.
 */
export function moodPictureTimesRowText(
  translator: Pick<Translator, "t" | "formatSeconds">,
  mood: SlideshowMood,
  beatsPerMinute: number | undefined,
): string {
  const { t } = translator;
  const name = t(mood === "calm" ? "mood.calm" : "mood.lively");
  const value = moodPictureTimesValueText(translator, mood, beatsPerMinute);
  return t("music.pictureTimesByMood", { name, value });
}
