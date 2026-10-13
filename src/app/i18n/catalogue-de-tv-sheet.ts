import type { Message } from "./messages.ts";

/** German copy of "Show on TV" in the app (tv_remote/IN_THE_APP.md); part of the German catalogue. */
export const deTvSheet = {
  "tvSheet.rowTitle": "Auf dem Fernseher zeigen",
  "tvSheet.rowText": "Auf einem Fernseher abspielen, dein Handy ist die Fernbedienung",
  "tvSheet.title": "Auf dem Fernseher zeigen",
  "tvSheet.codeBefore": "Öffne ",
  "tvSheet.codeAfter":
    " im Browser des Fernsehers, dann scanne den Code auf dem Bildschirm mit deiner Kamera oder tippe ihn hier ein.",
  "tvSheet.codeLabel": "Code vom Fernseher",
  "tvSheet.letter": "Buchstabe {number} von {count}",
  "tvSheet.lettersTyped": "{typed} von {count} Buchstaben",
  "tvSheet.connect": "Verbinden",
  "tvSheet.connecting": "Verbinde …",
  "tvSheet.connected": "Mit Fernseher {code} verbunden",
  "tvSheet.which": "Welche Diashow soll der Fernseher zeigen?",
  "tvSheet.loadingSlideshows": "Deine Diashows werden gelesen …",
  "tvSheet.noSlideshows": "Auf deinem Glissando-Server gibt es noch keine Diashow.",
  "tvSheet.cardFacts": "{pictures} · {duration}",
  "tvSheet.show": "Auf dem Fernseher zeigen",
  "tvSheet.disconnect": "Trennen",
  "tvSheet.noMatchStrong": "Dieser Code passt zu keinem Fernseher",
  "tvSheet.noMatchText":
    "Prüfe die Buchstaben auf dem Fernseher. Ein Code gilt nicht mehr, wenn der Fernseher geschlossen wurde oder 15 Minuten gewartet hat; lade dort die Seite neu, um einen neuen zu bekommen.",
  "tvSheet.typeAgain": "Neu eingeben",
  "tvSheet.tvClosed":
    "Der Fernseher wurde geschlossen. Öffne dort wieder {address} und tippe den neuen Code ein.",
  "tvSheet.claimFailed":
    "Die Verbindung zum Fernseher klappt gerade nicht. Dein Glissando-Server antwortet nicht.",
  "tvSheet.listFailed":
    "Deine Diashows konnten nicht gelesen werden. Dein Glissando-Server antwortet nicht.",
  "tvSheet.showFailed":
    "Die Diashow konnte nicht auf den Fernseher geschickt werden. Dein Glissando-Server antwortet nicht.",
} as const satisfies Record<string, Message>;
