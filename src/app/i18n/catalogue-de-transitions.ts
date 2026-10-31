import type { Message } from "./messages.ts";

/** German copy of the slideshow's default transition; part of the German catalogue. */
export const deTransitions = {
  "slideshow.transitionDefault": "Automatisch",
  "slideshow.transitionOwnChoice": "gewählt",
  "slideshow.transitionOwnCount": { one: "{count} eigener", other: "{count} eigene" },
  "slideshow.transitionSummary": "{choice} · {own}",
  "transitions.title": "Übergänge der Diashow",
  "transitions.default": "Automatisch",
  "transitions.ownChoice": "Gewählt",
  "transitions.defaultTag": "Automatisch",
  "transitions.hintAlternate":
    "Die Effekte wechseln von Bild zu Bild ab, nie zweimal derselbe hintereinander.",
  "transitions.hintCut": "Die Bilder folgen ohne Übergang aufeinander.",
  "transitions.hintMood":
    "Durch die Stimmung {name} festgelegt. Eine andere Wahl wechselt die Stimmung auf Automatisch.",
  "transitions.hintEffect":
    "Jeder Übergang: {effect}. Er dauert {share} % der Bilddauer, höchstens {max} s.",
  "transitions.ownKept": {
    one: "Bild {numbers} behält seinen eigenen Übergang – zu ändern im Bildeditor.",
    other: "Bild {numbers} behalten ihren eigenen Übergang – zu ändern im Bildeditor.",
  },
  "transitions.numberList": "{rest} und {last}",
  "transitions.reset": "Zurück auf Überblenden",
  "transitions.alreadyDefault": "Die Übergänge stehen schon auf Überblenden",
  "transitions.resetDone": "Übergänge wieder auf Überblenden",
} as const satisfies Record<string, Message>;
