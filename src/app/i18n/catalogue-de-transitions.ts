import type { Message } from "./messages";

/** German copy of the slideshow's default transition; part of the German catalogue. */
export const deTransitions = {
  "slideshow.transitionDefault": "Vorgabe",
  "slideshow.transitionOwnChoice": "eigene Wahl",
  "slideshow.transitionOwnCount": { one: "{count} eigener", other: "{count} eigene" },
  "slideshow.transitionSummary": "{choice} · {own}",
  "slideshow.change": "Ändern",
  "transitions.title": "Übergänge der Diashow",
  "transitions.default": "Vorgabe",
  "transitions.ownChoice": "Eigene Wahl",
  "transitions.defaultTag": "Vorgabe",
  "transitions.hintAlternate":
    "Die Effekte wechseln von Bild zu Bild ab, nie zweimal derselbe hintereinander.",
  "transitions.hintCut": "Die Bilder folgen ohne Übergang aufeinander.",
  "transitions.hintEffect":
    "Jeder Übergang: {effect}. Er dauert {share} % der Bildzeit, höchstens {max} s.",
  "transitions.ownKept": {
    one: "Bild {numbers} behält seinen eigenen Übergang – zu ändern im Bildeditor.",
    other: "Bild {numbers} behalten ihren eigenen Übergang – zu ändern im Bildeditor.",
  },
  "transitions.numberList": "{rest} und {last}",
  "transitions.reset": "Zurück auf Überblenden",
  "transitions.alreadyDefault": "Die Übergänge stehen schon auf Überblenden",
  "transitions.resetDone": "Übergänge wieder auf Überblenden",
} as const satisfies Record<string, Message>;
