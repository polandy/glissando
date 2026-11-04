import type { Catalogue } from "./messages.ts";
import type { deTiming } from "./catalogue-de-timing.ts";

/** English copy of a picture's chosen picture length and transition; typed to the German keys. */
export const enTiming: Pick<Catalogue, keyof typeof deTiming> = {
  "slideshow.pictureTimes": "Picture length",
  "slideshow.musicLength": "{duration} of music",
  "slideshow.pictureLabelOwnDuration": ", chosen picture length {duration}",
  "slideshow.pictureLabelOwnTransition": ", chosen transition {effect}",
  "editor.endOfSlideshow": "End of slideshow",
  "editor.previewTransition": "{duration}, with {effect} {length} into picture {next}",
  "editor.previewCut": "{duration}, then a cut to picture {next}",
  "editor.previewEnd": "{duration}, then the slideshow ends",
  "editor.timing": "Timing",
  "editor.ownTiming": "Chosen",
  "editor.timingAlreadyAutomatic": "The timing is already automatic",
  "editor.pictureLength": "Picture length",
  "editor.lengthScale": "{seconds} s",
  "editor.lengthAutomaticMark": "Automatic: {seconds}",
  "editor.durationHintAutomatic": "Follows the slideshow's picture length.",
  "editor.durationHintOwn": "Automatic would be {duration}.",
  "editor.durationHintMusic": "Follows the music: {duration}.",
  "editor.durationHintMusicOwn": {
    one: "The other picture now shows {share}.",
    other: "The other {count} pictures now show {share} each.",
  },
  "editor.durationHintMusicClamped": {
    one: "The other picture now shows only {share}, the shortest it can.",
    other: "The other {count} pictures now show only {share} each, the shortest they can.",
  },
  "editor.durationHintAllOwn":
    "Every picture has a chosen picture length; the music sets none of them.",
  "editor.transitionTo": "Transition to picture {number}",
  "editor.lastPicture": "Last picture",
  "editor.endsHere": "The slideshow ends here",
  "editor.endsHereRest": ", without a transition.",
  "editor.storedTransitionStays":
    "The chosen transition “{effect}” stays saved and applies again once a picture follows.",
  "editor.transitionFollowsSlideshow":
    "Automatically, the slideshow's transition applies: {effect}.",
  "editor.transitionsAlternate":
    "Automatically, the transitions alternate, as set for the slideshow.",
  "editor.transitionHint": "{effect} to picture {number}, {length}.",
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
