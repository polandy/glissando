import { moodSettings } from "../../compose/mood-settings";
import type { SlideshowMood } from "../../library/slideshow-mood";
import type { Translator } from "../i18n/translator";

/** A mood's beat step rounds against the song's tempo, in beats per minute. */
const SECONDS_PER_MINUTE = 60;

/**
 * The music editor's picture-length row while the slideshow's mood sets it (MOOD.md): "Picture
 * times are set by the mood Calm — ~6.3 s · 8 beats" (or "~7 s" without a tempo). Kept apart from
 * the slideshow screen's own mood text (`mood-text.ts`), which is that screen's internals.
 */
export function moodPictureTimesRowText(
  translator: Pick<Translator, "t" | "formatSeconds">,
  mood: SlideshowMood,
  beatsPerMinute: number | undefined,
): string {
  const { t, formatSeconds } = translator;
  const name = t(mood === "calm" ? "mood.calm" : "mood.lively");
  const settings = moodSettings(mood, beatsPerMinute);
  const seconds = formatSeconds(settings.secondsPerPicture);
  const value =
    beatsPerMinute === undefined
      ? t("mood.pictureTimesNoBeat", { seconds })
      : t("mood.pictureTimesWithBeats", {
          seconds,
          beats: Math.round((settings.secondsPerPicture * beatsPerMinute) / SECONDS_PER_MINUTE),
        });
  return t("music.pictureTimesByMood", { name, value });
}
