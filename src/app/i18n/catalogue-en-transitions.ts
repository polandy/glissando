import type { Catalogue } from "./messages.ts";
import type { deTransitions } from "./catalogue-de-transitions.ts";

/** English copy of the slideshow's default transition; typed to the German keys. */
export const enTransitions: Pick<Catalogue, keyof typeof deTransitions> = {
  "slideshow.transitionDefault": "automatic",
  "slideshow.transitionOwnChoice": "chosen",
  "slideshow.transitionOwnCount": { one: "{count} own", other: "{count} own" },
  "slideshow.transitionSummary": "{choice} · {own}",
  "transitions.title": "Slideshow transitions",
  "transitions.default": "Automatic",
  "transitions.ownChoice": "Chosen",
  "transitions.defaultTag": "Automatic",
  "transitions.hintAlternate":
    "The effects alternate from picture to picture, never the same one twice in a row.",
  "transitions.hintCut": "The pictures follow one another without a transition.",
  "transitions.hintMood": "Set by the mood {name}. Choosing another turns the mood off.",
  "transitions.hintEffect":
    "Every transition: {effect}. It takes {share} % of the picture length, at most {max} s.",
  "transitions.ownKept": {
    one: "Picture {numbers} keeps its own transition – change it in the picture editor.",
    other: "Pictures {numbers} keep their own transitions – change them in the picture editor.",
  },
  "transitions.numberList": "{rest} and {last}",
  "transitions.reset": "Back to crossfade",
  "transitions.alreadyDefault": "The transitions are already set to crossfade",
  "transitions.resetDone": "Transitions back to crossfade",
};
