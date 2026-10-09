import type { Catalogue } from "./messages";
import type { deMusic } from "./catalogue-de-music";

/** English copy of the music editor; typed to the German keys. */
export const enMusic: Pick<Catalogue, keyof typeof deMusic> = {
  "slideshow.musicWholeTrack": "whole track",
  "slideshow.musicExcerpt": "{from}–{to}",
  "slideshow.musicFades-in-and-out": "fades in and out",
  "slideshow.musicFades-in": "fades in",
  "slideshow.musicFades-out": "fades out",
  "slideshow.musicSummary": "{excerpt} · {fades}",
  "music.crumb": "Music",
  "music.trimmedTo": "{duration} · trimmed to {excerpt}",
  "music.start": "Start",
  "music.end": "End",
  "music.earlier": "{edge} half a second earlier",
  "music.later": "{edge} half a second later",
  "music.slideshowLane": { one: "Slideshow, one picture", other: "Slideshow, {count} pictures" },
  "music.listenStart": "Listen to the start",
  "music.listenEnd": "Listen to the end",
  "music.listenFrom": "from {time}",
  "music.listenUntil": "until {time}",
  "music.hint":
    "Drag the handles or move them with the arrow keys (Shift: 1 s). The orange line shows the volume with its fades.",
  "music.excerpt": "Excerpt",
  "music.wholeTrack": "Whole track",
  "music.trimmed": "Trimmed",
  "music.wholeTrackHint": "The slideshow uses the whole track, {duration}.",
  "music.fadeIn": "Fade in",
  "music.fadeOut": "Fade out",
  "music.fadeAutomatic": "Automatic",
  "music.fadeOwn": "Own",
  "music.fadeOff": "Off",
  "music.fadeShort": "Short",
  "music.fadeLong": "Long",
  "music.fadeNone": "–",
  "music.automaticBecause": "Automatic: {reason}.",
  "music.reason-excerpt-starts-mid-track": "short, as the excerpt starts mid-track",
  "music.reason-track-starts": "off, as the track plays from its start",
  "music.reason-slideshow-ends": "short, as the slideshow ends at {time}",
  "music.reason-excerpt-ends-early": "short, as the excerpt stops before the track ends",
  "music.reason-track-ends": "off, as the track ends by itself",
  "music.pictureTimes": "Picture times",
  "music.noteShared": {
    one: "The picture without its own duration gets the excerpt: {share}. The slideshow ends with the music.",
    other:
      "{count} pictures without their own duration share the excerpt: {share} each. The slideshow ends with the music.",
  },
  "music.noteOutlasts": "The slideshow runs {over} longer than the music.",
  "music.noteOutlastsWhy": {
    one: "The picture without its own duration gets the minimum of {min}; after the fade-out the last pictures play in silence. A longer excerpt fixes that.",
    other:
      "{count} pictures get the minimum of {min}; after the fade-out the last pictures play in silence. A longer excerpt fixes that.",
  },
  "music.noteOutlastsAllOwn":
    "Every picture has its own duration; after the fade-out the last pictures play in silence.",
  "music.noteEndsEarly":
    "Every picture has its own duration. The slideshow ends after {time}; the music fades out there.",
  "music.noteEndsWithMusic":
    "Every picture has its own duration. The slideshow ends with the music.",
};
