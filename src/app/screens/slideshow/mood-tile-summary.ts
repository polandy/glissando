import type { SlideshowMood } from "../../../library/slideshow-mood";
import type { Translator } from "../../i18n/translator";
import { energyPictureTimesRangeValueText } from "./energy-pacing-text";
import type { MoodEnergyPacing } from "./mood-energy-pacing";
import { moodPictureTimesText } from "./mood-text";

/** What the Mood tile's summary (ADR-0048) is built from. */
export interface MoodTileInput {
  readonly mood: SlideshowMood | undefined;
  /** How many pictures show for a duration of their own; only read under Custom. */
  readonly ownDurationCount: number;
  /** The Mood sheet's "Follow the music's energy" switch (ADR-0046). */
  readonly energyPacing: boolean;
  readonly hasMusic: boolean;
}

function motionText(t: Translator["t"], mood: SlideshowMood | undefined): string {
  if (mood === undefined) {
    return t("mood.motionStandard");
  }
  return mood === "calm" ? t("mood.motionGentle") : t("mood.motionStrong");
}

/**
 * The picture-times part of the Mood tile's summary (ADR-0048): a mood's own text, or under
 * Custom the slideshow's automatic (or own-count) text; under a mood, the energy-paced range
 * once the energy pacing is on, the slideshow has music and the range found varies.
 */
function pictureTimesText(
  translator: Pick<Translator, "t" | "formatSeconds">,
  input: MoodTileInput,
  moodBpm: number | undefined,
  energyRange: MoodEnergyPacing | null,
  energyOn: boolean,
): string {
  const { t } = translator;
  if (input.mood === undefined) {
    return input.ownDurationCount > 0
      ? t("slideshow.automaticWithOwn", { count: input.ownDurationCount })
      : t("slideshow.automatic");
  }
  if (energyOn && energyRange !== null && energyRange.maxMs > energyRange.minMs) {
    return energyPictureTimesRangeValueText(translator, energyRange.minMs, energyRange.maxMs);
  }
  return moodPictureTimesText(translator, input.mood, moodBpm);
}

/**
 * The Mood tile's summary (ADR-0048): the picture times, then the motion, then "follows the
 * energy" while the energy pacing is on and the slideshow has music.
 */
export function moodTileSummaryText(
  translator: Pick<Translator, "t" | "formatSeconds">,
  input: MoodTileInput,
  moodBpm: number | undefined,
  energyRange: MoodEnergyPacing | null,
): string {
  const { t } = translator;
  const energyOn = input.energyPacing && input.hasMusic;
  const parts = [
    pictureTimesText(translator, input, moodBpm, energyRange, energyOn),
    motionText(t, input.mood),
  ];
  if (energyOn) {
    parts.push(t("mood.followsTheEnergy"));
  }
  return parts.join(" · ");
}
