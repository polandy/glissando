import type { PlaylistEnergy } from "./energy/playlist-energy";
import type { PortraitPictures } from "../library/portrait-pictures";
import type { StoredPicture } from "../library/stored-slideshow";
import { slideDurationsMs } from "./slide-durations-ms";
import { slideOfPicture, slideUnits, timedUnit } from "./slide-units";

/**
 * The duration each picture's slide shows, one entry per picture, for UI that shows a picture's
 * own timing (picture editor, "add pictures" note): a picture composed into a pair shows the
 * pair's shared duration, since the two change together (ADR-0028).
 */
export function pictureDurationsMs(
  pictures: readonly StoredPicture[],
  portraitPictures: PortraitPictures | undefined,
  /** The length the pictures fill (`filledMusicMs`); absent: they last their seconds. */
  filledMs: number | undefined,
  secondsPerPicture: number,
  /** The beats to change on, in ms of the playlist (`playlistBeatsMs`); absent: none. */
  beatsMs?: readonly number[],
  /** The playlist's energy and lifts (`playlistEnergy`); absent: the usual durations stand. */
  energy?: PlaylistEnergy,
): number[] {
  const units = slideUnits(pictures, portraitPictures);
  const slideDurations = slideDurationsMs(
    units.map((unit) => timedUnit(pictures, unit)),
    filledMs,
    secondsPerPicture,
    beatsMs,
    energy,
  );
  return pictures.map((_, index) => slideDurations[slideOfPicture(units, index)] as number);
}
