import type { Message } from "./messages.ts";

/** German copy of a picture's own duration and transition; part of the German catalogue. */
export const deTiming = {
  "slideshow.pictureTimes": "Bilddauer",
  "slideshow.musicLength": "{duration} Musik",
  "slideshow.pictureLabelOwnDuration": ", eigene Dauer {duration}",
  "slideshow.pictureLabelOwnTransition": ", eigener Übergang {effect}",
  "editor.endOfSlideshow": "Ende der Diashow",
  "editor.previewTransition": "{duration}, darin {effect} {length} zu Bild {next}",
  "editor.previewCut": "{duration}, dann Schnitt zu Bild {next}",
  "editor.previewEnd": "{duration}, dann endet die Diashow",
  "editor.timing": "Zeitablauf",
  "editor.ownTiming": "Eigener Zeitablauf",
  "editor.timingAlreadyAutomatic": "Der Zeitablauf ist schon automatisch",
  "editor.pictureLength": "Bilddauer",
  "editor.lengthScale": "{seconds} s",
  "editor.lengthAutomaticMark": "Automatisch: {seconds} s",
  "editor.durationHintAutomatic": "Folgt der Bilddauer der Diashow.",
  "editor.durationHintOwn": "Automatisch wären es {duration}.",
  "editor.durationHintMusic": {
    one: "Die Musik gehört dem einen Bild ohne eigene Dauer.",
    other: "Die Musik verteilt sich gleichmäßig auf die {count} Bilder ohne eigene Dauer.",
  },
  "editor.durationHintMusicOwn": {
    one: "Das übrige Bild bekommt den Rest der Musik: {share}.",
    other: "Die übrigen {count} Bilder teilen sich den Rest der Musik: je {share}.",
  },
  "editor.durationHintMusicClamped": {
    one: "Die Musik ist aufgebraucht; das übrige Bild bekommt das Minimum, {share}.",
    other:
      "Die Musik ist aufgebraucht; die übrigen {count} Bilder bekommen das Minimum, je {share}.",
  },
  "editor.durationHintAllOwn":
    "Alle Bilder haben eine eigene Dauer; die Diashow folgt nicht mehr der Länge der Musik.",
  "editor.transitionTo": "Übergang zu Bild {number}",
  "editor.lastPicture": "Letztes Bild",
  "editor.endsHere": "Hier endet die Diashow",
  "editor.endsHereRest": ", ohne Übergang.",
  "editor.storedTransitionStays":
    "Der eigene Übergang „{effect}“ bleibt gespeichert und gilt wieder, sobald ein Bild folgt.",
  "editor.transitionFollowsSlideshow": "Automatisch gilt der Übergang der Diashow: {effect}.",
  "editor.transitionsAlternate":
    "Automatisch wechseln die Übergänge ab, wie für die Diashow eingestellt.",
  "editor.transitionHint":
    "Dauert {length}, am Ende von Bild {number}: {share} % der Bilddauer, höchstens {max} s.",
  "editor.cutHint": "Bild {number} folgt ohne Übergang.",
  "editor.autoTag": "Auto",
  "effect.crossfade": "Überblenden",
  "effect.push-left": "Schieben",
  "effect.wipe-right": "Wischen",
  "effect.circle-open": "Kreis",
  "effect.zoom-in": "Zoom",
  "effect.dissolve": "Auflösen",
  "effect.cut": "Harter Schnitt",
  "effect.alternate": "Abwechselnd",
} as const satisfies Record<string, Message>;
