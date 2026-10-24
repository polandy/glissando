import type { SongBeats } from "../../../compose/playlist";
import type { SongLoudness } from "../../../compose/song-loudness";
import type { SlideshowMood } from "../../../library/slideshow-mood";
import type { StoredSlideshow } from "../../../library/stored-slideshow";
import type { Translator } from "../../i18n/translator";
import { energyPictureTimesRangeText } from "./energy-pacing-text";
import { energyStripGeometry, type EnergyStripGeometry } from "./energy-strip-geometry";
import { moodEnergyPacing, moodEnergyStripData } from "./mood-energy-pacing";
import { moodPictureTimesText } from "./mood-text";

/** The beats and loudness `MoodPreview.svelte` already loaded, for the energy pacing rows. */
export interface MoodEnergyAnalysis {
  readonly beats: SongBeats;
  readonly loudness: SongLoudness;
}

/** The Mood sheet's rows and strip that change once "Follow the music's energy" is on (ADR-0046). */
export interface MoodSheetEnergyView {
  readonly pictureTimesText: string;
  readonly hasLift: boolean;
  readonly hintText: string;
  readonly stripGeometry: EnergyStripGeometry | null;
}

/**
 * What the Mood sheet's "Picture times"/"At a drop or chorus" rows, hint and energy strip show,
 * given whether the switch is on and the analysis `MoodPreview.svelte` has loaded so far (`null`
 * while it has not, or the switch is off: every row then falls back to its usual text).
 */
export function moodSheetEnergyView(
  translator: Translator,
  stored: StoredSlideshow,
  shownMood: SlideshowMood | undefined,
  moodBpm: number | undefined,
  analysis: MoodEnergyAnalysis | null,
): MoodSheetEnergyView {
  const { t } = translator;
  const on = stored.energyPacing === true;
  const pacing =
    on && analysis !== null
      ? moodEnergyPacing(stored, shownMood, analysis.beats, analysis.loudness)
      : null;
  const pictureTimesText =
    pacing !== null && pacing.maxMs > pacing.minMs
      ? energyPictureTimesRangeText(translator, pacing.minMs, pacing.maxMs)
      : moodPictureTimesText(translator, shownMood, moodBpm);
  const hintText = on
    ? shownMood === undefined
      ? t("mood.hintCustomEnergy")
      : t("mood.hintMoodEnergy")
    : shownMood === undefined
      ? t("mood.hintCustom")
      : t("mood.hintMood");
  const stripGeometry =
    on && analysis !== null
      ? energyStripGeometry(
          moodEnergyStripData(stored, shownMood, analysis.beats, analysis.loudness),
        )
      : null;
  return {
    pictureTimesText,
    hasLift: pacing !== null && pacing.firstLiftUnitIndex !== undefined,
    hintText,
    stripGeometry,
  };
}
