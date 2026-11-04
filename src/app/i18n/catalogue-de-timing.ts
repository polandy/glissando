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
  "editor.lengthAutomaticMark": "Automatisch: {seconds}",
  "editor.durationHintAutomatic": "Folgt der Bilddauer der Diashow.",
  "editor.durationHintOwn": "Automatisch wären es {duration}.",
  "editor.durationHintMusic": "Folgt der Musik: {duration}.",
  "editor.durationHintMusicOwn": {
    one: "Das übrige Bild steht jetzt {share}.",
    other: "Die übrigen {count} Bilder stehen jetzt je {share}.",
  },
  "editor.durationHintMusicClamped": {
    one: "Das übrige Bild steht jetzt nur {share}, so kurz wie möglich.",
    other: "Die übrigen {count} Bilder stehen jetzt nur je {share}, so kurz wie möglich.",
  },
  "editor.durationHintAllOwn":
    "Jedes Bild hat eine gewählte Bilddauer; die Musik bestimmt keine davon.",
  "editor.transitionTo": "Übergang zu Bild {number}",
  "editor.lastPicture": "Letztes Bild",
  "editor.endsHere": "Hier endet die Diashow",
  "editor.endsHereRest": ", ohne Übergang.",
  "editor.storedTransitionStays":
    "Der eigene Übergang „{effect}“ bleibt gespeichert und gilt wieder, sobald ein Bild folgt.",
  "editor.transitionFollowsSlideshow": "Automatisch gilt der Übergang der Diashow: {effect}.",
  "editor.transitionsAlternate":
    "Automatisch wechseln die Übergänge ab, wie für die Diashow eingestellt.",
  "editor.transitionHint": "{effect} zu Bild {number}, {length}.",
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
