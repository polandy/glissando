import type { Message } from "./messages";

/** German copy of adding pictures to a slideshow and of duplicates; part of the German catalogue. */
export const deAdd = {
  "add.title": "Bilder hinzufügen",
  "add.titleShort": "Hinzufügen",
  "add.leadByDate": "Sie kommen nach Aufnahmedatum an ihren Platz.",
  "add.leadOwnOrder":
    "Deine eigene Reihenfolge bleibt; wähle unten, wohin die neuen Bilder kommen.",
  "add.leadDownscale": "Glissando verkleinert sie fürs Gerät, die Originale bleiben unberührt.",
  "add.placementTitle": "Wohin sie kommen",
  "add.placementByDate": "Nach Aufnahmedatum",
  "add.placementByDateHint":
    "Jedes kommt direkt hinter das Bild, das kurz davor aufgenommen wurde.",
  "add.placementAtEnd": "Ans Ende",
  "add.placementAtEndHint": "Hinter Bild {number}, in Aufnahme-Reihenfolge.",
  "add.spotAfter": { one: "{count} hinter Bild {number}", other: "{count} hinter Bild {number}" },
  "add.spotStart": { one: "{count} vor Bild 1", other: "{count} vor Bild 1" },
  "add.placementOrder": "Reihenfolge nach dem Hinzufügen",
  "add.afterTitle": "Danach",
  "add.afterPictures": "Bilder",
  "add.afterDuration": "Dauer",
  "add.afterPerPicture": "Pro Bild",
  "add.beforeAfter": "{before} → {after}",
  "add.sharesMusic":
    "Die Bilder teilen sich weiter die Musik; jedes wird etwas kürzer. Bilder mit eigener Dauer behalten sie.",
  "add.musicTooShort": "Die Musik reicht nicht für alle Bilder.",
  "add.musicTooShortText":
    "Kürzer als {seconds} zeigt Glissando kein Bild; die Diashow dauert {total}, die Musik {music}.",
  "add.noMusic": "Ohne Musik bekommt jedes neue Bild {seconds}; die Diashow wird länger.",
  "add.add": { one: "{count} hinzufügen", other: "{count} hinzufügen" },
  "add.added": { one: "{count} Bild hinzugefügt", other: "{count} Bilder hinzugefügt" },
  "add.newBadge": "neu",
  "add.newLabel": "{label}, neu",
  "add.alreadyIn": {
    one: "{count} Bild ist schon in der Diashow und wird übersprungen:",
    other: "{count} Bilder sind schon in der Diashow und werden übersprungen:",
  },
  "add.chosenTwice": {
    one: "{count} Bild wurde doppelt gewählt und wird übersprungen:",
    other: "{count} Bilder wurden doppelt gewählt und werden übersprungen:",
  },
  "add.addAnyway": "Trotzdem hinzufügen",
} as const satisfies Record<string, Message>;
