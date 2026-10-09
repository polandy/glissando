import type { Catalogue } from "./messages";
import type { deTransitions } from "./catalogue-de-transitions";

/** English copy of the slideshow's default transition; typed to the German keys. */
export const enTransitions: Pick<Catalogue, keyof typeof deTransitions> = {
  "slideshow.transitionDefault": "default",
  "slideshow.transitionOwnChoice": "own choice",
  "slideshow.transitionOwnCount": { one: "{count} own", other: "{count} own" },
  "slideshow.transitionSummary": "{choice} · {own}",
  "slideshow.change": "Change",
  "transitions.title": "Slideshow transitions",
  "transitions.default": "Default",
  "transitions.ownChoice": "Own choice",
  "transitions.defaultTag": "Default",
  "transitions.hintAlternate":
    "The effects alternate from picture to picture, never the same one twice in a row.",
  "transitions.hintCut": "The pictures follow one another without a transition.",
  "transitions.hintEffect":
    "Every transition: {effect}. It takes {share} % of the picture's time, at most {max} s.",
  "transitions.ownKept": {
    one: "Picture {numbers} keeps its own transition – change it in the picture editor.",
    other: "Pictures {numbers} keep their own transitions – change them in the picture editor.",
  },
  "transitions.numberList": "{rest} and {last}",
  "transitions.reset": "Back to crossfade",
  "transitions.alreadyDefault": "The transitions are already set to crossfade",
  "transitions.resetDone": "Transitions back to crossfade",
};
