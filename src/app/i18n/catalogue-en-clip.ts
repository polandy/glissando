import type { Catalogue } from "./messages.ts";
import type { deClip } from "./catalogue-de-clip.ts";

/** English copy of video slides; typed to the German keys. */
export const enClip: Pick<Catalogue, keyof typeof deClip> = {
  "clip.badge": "Video",
  "clip.badgeLength": "Video, {length}",
  "clip.cutFlag": "Excerpt",
  "clip.longNotice": {
    one: "{count} clip is longer than {max}. The slideshow plays an excerpt of up to {max}; you choose it later in the clip editor.",
    other:
      "{count} clips are longer than {max}. The slideshow plays an excerpt of up to {max} of each; you choose it later in the clip editor.",
  },
  "clip.refusedUnplayable":
    "“{fileName}” cannot be played on this device. This format isn't supported here.",
  "clip.refusedTooLarge": "“{fileName}” is larger than {max} and is not taken in.",
  "clip.refusedTooShort": "“{fileName}” is shorter than {min} and is not taken in.",
  "clip.crumb": "Clip {number}",
  "clip.previewLabel": "Preview of the excerpt",
  "clip.scrub": "Position in the excerpt",
  "clip.play": "Play",
  "clip.pause": "Pause",
  "clip.previewFailed": "This device cannot play the clip.",
  "clip.missing": "The clip is no longer on this device.",
  "clip.strip": "Choose the excerpt",
  "clip.noSound": "No sound in this clip",
  "clip.soundUnreadable": "Sound can't be read here",
  "clip.handleStart": "Start",
  "clip.handleEnd": "End",
  "clip.from": "From",
  "clip.to": "To",
  "clip.inFilm": "In the slideshow: {length}",
  "clip.sound": "Sound",
  "clip.soundOn": "On",
  "clip.soundOff": "Off",
  "clip.volume": "Volume",
  "clip.volumeValue": "{percent}%",
  "clip.duck": "Music quieter meanwhile",
  "clip.transitionNote":
    "The transition to the next slide runs in the last {length} of the excerpt.",
  "clip.reset": "Reset",
  "clip.done": "Done",
};
