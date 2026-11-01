import type { Catalogue } from "./messages.ts";
import type { deTiming } from "./catalogue-de-timing.ts";

/** English copy of a picture's own duration and transition; typed to the German keys. */
export const enTiming: Pick<Catalogue, keyof typeof deTiming> = {
  "slideshow.pictureTimes": "Picture length",
  "slideshow.musicLength": "{duration} of music",
  "slideshow.pictureLabelOwnDuration": ", own duration {duration}",
  "slideshow.pictureLabelOwnTransition": ", own transition {effect}",
  "editor.endOfSlideshow": "End of slideshow",
  "editor.previewTransition": "{duration}, with {effect} {length} into picture {next}",
  "editor.previewCut": "{duration}, then a cut to picture {next}",
  "editor.previewEnd": "{duration}, then the slideshow ends",
  "editor.timing": "Timing",
  "editor.ownTiming": "Own timing",
  "editor.timingAlreadyAutomatic": "The timing is already automatic",
  "editor.pictureLength": "Picture length",
  "editor.lengthScale": "{seconds} s",
  "editor.lengthAutomaticMark": "Automatic: {seconds} s",
  "editor.durationHintAutomatic": "Follows the slideshow's picture length.",
  "editor.durationHintOwn": "Automatic would be {duration}.",
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
  "editor.transitionTo": "Transition to picture {number}",
  "editor.lastPicture": "Last picture",
  "editor.endsHere": "The slideshow ends here",
  "editor.endsHereRest": ", without a transition.",
  "editor.storedTransitionStays":
    "The own transition “{effect}” stays saved and applies again once a picture follows.",
  "editor.transitionFollowsSlideshow":
    "Automatically, the slideshow's transition applies: {effect}.",
  "editor.transitionsAlternate":
    "Automatically, the transitions alternate, as set for the slideshow.",
  "editor.transitionHint":
    "Takes {length} at the end of picture {number}: {share} % of the picture length, at most {max} s.",
  "editor.cutHint": "Picture {number} follows without a transition.",
  "editor.autoTag": "Auto",
  "effect.crossfade": "Crossfade",
  "effect.push-left": "Push",
  "effect.wipe-right": "Wipe",
  "effect.circle-open": "Circle",
  "effect.zoom-in": "Zoom",
  "effect.dissolve": "Dissolve",
  "effect.cut": "Hard cut",
  "effect.alternate": "Alternating",
};
