import type { Message } from "./messages";

/** German copy of a picture's own duration and transition; part of the German catalogue. */
export const deTiming = {
  "slideshow.pictureTimes": "Bildzeiten",
  "slideshow.alternatingWithOwn": "abwechselnd, {count} eigene",
  "slideshow.musicLength": "Musik {duration}",
  "slideshow.pictureLabelOwnDuration": ", eigene Dauer {duration}",
  "slideshow.pictureLabelOwnTransition": ", eigener Übergang {effect}",
  "editor.endOfSlideshow": "Ende der Diashow",
  "editor.previewTransition": "{duration}, darin {effect} {length} zu Bild {next}",
  "editor.previewCut": "{duration}, dann Schnitt zu Bild {next}",
  "editor.previewEnd": "{duration}, dann endet die Diashow",
  "editor.duration": "Dauer",
  "editor.ownDuration": "Eigene Dauer",
  "editor.durationShorter": "Eine halbe Sekunde kürzer",
  "editor.durationLonger": "Eine halbe Sekunde länger",
  "editor.durationHintAutomatic":
    "Die Sekunden pro Bild dieser Diashow. Mit + und − wird es eine eigene Dauer.",
  "editor.durationHintOwn":
    "Automatisch wären es {duration}, die Sekunden pro Bild dieser Diashow.",
  "editor.durationHintMusic": {
    one: "Die Musik gehört dem einen Bild ohne eigene Dauer.",
    other: "Die Musik verteilt sich gleichmäßig auf die {count} Bilder ohne eigene Dauer.",
  },
  "editor.durationHintMusicOwn": {
    one: "Das übrige Bild bekommt den Rest der Musik: {share}.",
    other: "Die übrigen {count} Bilder teilen sich den Rest der Musik: je {share}.",
  },
  "editor.durationHintAllOwn":
    "Alle Bilder haben eine eigene Dauer; die Diashow folgt nicht mehr der Länge der Musik.",
  "editor.durationRange": "{min} bis {max} s.",
  "editor.durationAlreadyAutomatic": "Die Dauer ist schon automatisch",
  "editor.transition": "Übergang",
  "editor.transitionTo": "Übergang zu Bild {number}",
  "editor.ownTransition": "Eigener Übergang",
  "editor.lastPicture": "Letztes Bild",
  "editor.endsHere": "Hier endet die Diashow",
  "editor.endsHereRest": ", ohne Übergang.",
  "editor.storedTransitionStays":
    "Der eigene Übergang „{effect}“ bleibt gespeichert und gilt wieder, sobald ein Bild folgt.",
  "editor.transitionsAlternate": "Automatisch wechseln die Übergänge von Bild zu Bild ab.",
  "editor.transitionHint":
    "Dauert {length}, am Ende von Bild {number}: {share} % der Bildzeit, höchstens {max} s.",
  "editor.cutHint": "Bild {number} folgt ohne Übergang.",
  "editor.transitionAlreadyAutomatic": "Der Übergang ist schon automatisch",
  "editor.autoTag": "Auto",
  "effect.crossfade": "Überblenden",
  "effect.push-left": "Schieben",
  "effect.wipe-right": "Wischen",
  "effect.circle-open": "Kreis",
  "effect.zoom-in": "Zoom",
  "effect.dissolve": "Auflösen",
  "effect.cut": "Schnitt",
} as const satisfies Record<string, Message>;
