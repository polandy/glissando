import type { Catalogue } from "./messages.ts";
import type { deMusic } from "./catalogue-de-music.ts";

/** English copy of music: its import and the music editor; typed to the German keys. */
export const enMusic: Pick<Catalogue, keyof typeof deMusic> = {
  "import.convertingButton": "Converting\u00a0…",
  "import.convertedFrom": "Converted from {format} on this device",
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
  "music.reason-slideshow-ends": "long, as the slideshow ends at {time}",
  "music.reason-excerpt-ends-early": "long, as the excerpt stops before the track ends",
  "music.reason-track-ends": "off, as the track ends by itself",
  "music.pictureTimes": "Picture times",
  "music.noteShared": {
    one: "The picture without its own duration gets the excerpt: {share}. The slideshow ends with the music.",
    other:
      "{count} pictures without their own duration share the excerpt: {share} each. The slideshow ends with the music.",
  },
  "music.noteSharedOnTheBeat": {
    one: "The picture without its own duration gets the excerpt: {share}. The slideshow ends with the music.",
    other:
      "{count} pictures without their own duration share the excerpt: about {share} each. The slideshow ends with the music.",
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
  "music.noteFitted":
    "Each picture without its own duration shrinks to about {seconds}, to end with the music.",
  "music.noteFittedOnTheBeat":
    "Each picture without its own duration shrinks to about {seconds}, each change on the nearest beat, to end with the music.",
  "music.noteOwnSeconds":
    "Each picture without its own duration stays {seconds}. The slideshow lasts {time}; the music fades out there.",
  "music.noteOwnSecondsOnTheBeat":
    "Each picture without its own duration stays about {seconds}, each change on the nearest beat. The slideshow lasts {time}; the music fades out there.",
  "music.noteOutlastsOwnSeconds":
    "Each picture without its own duration stays {seconds}; after the fade-out the last pictures play in silence. Shorter pictures, longer music or “Fill the music” fix that.",
  "music.pictureLength": "Picture length",
  "music.aboutSecondsEach": "About {seconds} each",
  "music.pictureLengthFitted": "Shortened to {seconds} to fit the music",
  "music.fillTheMusic": "Fill the music",
  "music.pictureTimesByMood": "Picture times are set by the mood {name} — {value}",
  "music.setOwnPictureTimes": "Set them yourself",
  "music.pictureChanges": "Picture changes",
  "music.beatsPerMinute": "{bpm} BPM",
  "music.onTheBeat": "On the beat",
  "music.evenly": "Evenly",
  "music.onTheBeatHint":
    "Every automatic change lands on a beat of the music; a transition lasts whole beats.",
  "music.ownDurationsOffBeat": {
    one: "Picture {pictures} keeps its own duration exactly: no automatic picture follows to take up the difference, so its change can fall between beats.",
    other:
      "Pictures {pictures} keep their own duration exactly: no automatic picture follows to take up the difference, so their changes can fall between beats.",
  },
  "music.evenlyHint": "The pictures share the music evenly, regardless of its beat.",
  "music.evenlyHintSeconds": "Each picture stays exactly {seconds}, regardless of the beat.",
  "music.listeningForBeat":
    "Listening for the beat… Until then the pictures share the music evenly.",
  "music.listeningForBeatSeconds":
    "Listening for the beat… Until then each picture stays exactly {seconds}.",
  "music.noSteadyBeat": "No steady beat found in this music. The pictures share it evenly.",
  "music.noSteadyBeatSeconds":
    "No steady beat found in this music. Each picture stays exactly {seconds}.",
  "music.musicUndecodable":
    "Glissando could not listen to this music's beat. The pictures share it evenly.",
  "music.musicUndecodableSeconds":
    "Glissando could not listen to this music's beat. Each picture stays exactly {seconds}.",
  "music.volume": "Volume",
  "music.volumeLevelled": "Levelled",
  "music.volumeOwn": "Own",
  "music.volumeMeasuring": "Measuring…",
  "music.volumeSubUnmeasured": "Plays unlevelled until measured",
  "music.volumeSubAsFarAsItGoes": "As far as it goes without distortion",
  "music.volumeSubSameLoudness": "Same loudness as the other songs",
  "music.volumeSubLouder": "Louder than levelled",
  "music.volumeSubQuieter": "Quieter than levelled",
  "music.volumeHintMeasuring": "Measuring its loudness… it plays unlevelled until then.",
  "music.volumeHintUndecodable":
    "Glissando could not listen to this song's loudness; it plays unlevelled.",
  "music.volumeHintCappedShort": "{shortDb} dB short of level, to avoid distorting.",
  "music.volumeHintCappedMax": "As loud as it gets without distortion.",
  "music.volumeHintLevelledBy": "Levelled by {levelDb} to match the other songs.",
  "music.volumeReset": "Back to levelled",
  "music.volumeListen": "Listen",
  "music.volumeListenStop": "Stop",
  "music.volumeListenAt": "at this volume, from the loudest part",
  "music.volumeListenOriginal": "original file, unlevelled",
  "music.volumeOriginalFile": "Original file",
  "music.volumeListenCompare": "While listening, tap another song to compare.",
  "music.volumeComparison": "Loudness of the songs",
  "music.volumeComparisonHint": "Grey line: original file",
};
