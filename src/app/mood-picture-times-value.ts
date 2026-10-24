import { moodSettings } from "../compose/mood-settings";
import type { SlideshowMood } from "../library/slideshow-mood";
import type { Translator } from "./i18n/translator";

/** A mood's beat step rounds against the song's tempo, in beats per minute. */
const SECONDS_PER_MINUTE = 60;

/**
 * `mood`'s picture-length value at `beatsPerMinute` (MOOD.md): "~6.3 s · 8 beats" with a tempo,
 * "~7 s" without one. Shared by the info panel row, the Mood sheet and the music editor's row
 * (`mood-text.ts`, `mood-picture-times-text.ts`), so the value reads the same everywhere.
 */
export function moodPictureTimesValueText(
  translator: Pick<Translator, "t" | "formatSeconds">,
  mood: SlideshowMood,
  beatsPerMinute: number | undefined,
): string {
  const { t, formatSeconds } = translator;
  const settings = moodSettings(mood, beatsPerMinute);
  const seconds = formatSeconds(settings.secondsPerPicture);
  if (beatsPerMinute === undefined) {
    return t("mood.pictureTimesNoBeat", { seconds });
  }
  const beats = Math.round((settings.secondsPerPicture * beatsPerMinute) / SECONDS_PER_MINUTE);
  return t("mood.pictureTimesWithBeats", { seconds, beats });
}
