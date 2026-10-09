import type { Catalogue } from "./messages";
import type { deTiming } from "./catalogue-de-timing";

/** English copy of a picture's own duration and transition; typed to the German keys. */
export const enTiming: Pick<Catalogue, keyof typeof deTiming> = {
  "slideshow.pictureTimes": "Picture times",
  "slideshow.alternatingWithOwn": "alternating, {count} own",
  "slideshow.musicLength": "music {duration}",
  "slideshow.pictureLabelOwnDuration": ", own duration {duration}",
  "slideshow.pictureLabelOwnTransition": ", own transition {effect}",
  "editor.endOfSlideshow": "End of slideshow",
  "editor.previewTransition": "{duration}, with {effect} {length} into picture {next}",
  "editor.previewCut": "{duration}, then a cut to picture {next}",
  "editor.previewEnd": "{duration}, then the slideshow ends",
  "editor.duration": "Duration",
  "editor.ownDuration": "Own duration",
  "editor.durationShorter": "Half a second shorter",
  "editor.durationLonger": "Half a second longer",
  "editor.durationHintAutomatic":
    "The slideshow's seconds per picture. − and + make it this picture's own.",
  "editor.durationHintOwn": "Automatic would be {duration}, the slideshow's seconds per picture.",
  "editor.durationHintMusic": {
    one: "The music goes to the one picture without an own duration.",
    other: "The music is shared evenly across the {count} pictures without an own duration.",
  },
  "editor.durationHintMusicOwn": {
    one: "The one other picture gets the rest of the music: {share}.",
    other: "The other {count} pictures share the rest of the music: {share} each.",
  },
  "editor.durationHintMusicClamped": {
    one: "The music is used up; the one other picture gets the minimum, {share}.",
    other: "The music is used up; the other {count} pictures get the minimum, {share} each.",
  },
  "editor.durationHintAllOwn":
    "Every picture has its own duration; the slideshow no longer follows the music's length.",
  "editor.durationRange": "{min} to {max} s.",
  "editor.durationAlreadyAutomatic": "The duration is already automatic",
  "editor.transition": "Transition",
  "editor.transitionTo": "Transition to picture {number}",
  "editor.ownTransition": "Own transition",
  "editor.lastPicture": "Last picture",
  "editor.endsHere": "The slideshow ends here",
  "editor.endsHereRest": ", without a transition.",
  "editor.storedTransitionStays":
    "The own transition “{effect}” stays saved and applies again once a picture follows.",
  "editor.transitionsAlternate": "Transitions alternate automatically from picture to picture.",
  "editor.transitionHint":
    "Takes {length} at the end of picture {number}: {share} % of the picture's time, at most {max} s.",
  "editor.cutHint": "Picture {number} follows without a transition.",
  "editor.transitionAlreadyAutomatic": "The transition is already automatic",
  "editor.autoTag": "Auto",
  "effect.crossfade": "Crossfade",
  "effect.push-left": "Push",
  "effect.wipe-right": "Wipe",
  "effect.circle-open": "Circle",
  "effect.zoom-in": "Zoom",
  "effect.dissolve": "Dissolve",
  "effect.cut": "Cut",
};
