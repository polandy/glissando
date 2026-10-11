import type { Message } from "./messages";

/** German copy of sharing a server slideshow by link; part of the German catalogue. */
export const deShare = {
  "share.rowTitle": "Link teilen",
  "share.rowText": "Alle mit dem Link können zuschauen",
  "share.rowSharedTitle": "Per Link geteilt",
  "share.on": "An",
  "share.deviceHint": "Speichere sie auf deinem Glissando-Server, um sie per Link zu teilen.",
  "share.title": "Per Link teilen",
  "share.summary": "{title} · {pictures} · {duration} · {music}",
  "share.anyoneStrong": "Alle mit dem Link können zuschauen",
  "share.anyoneAfter": " – im Browser, ohne Anmeldung und ohne etwas zu installieren.",
  "share.privateBefore": "Sie sehen die Diashow in 4K mit Musik und Bildtiteln. ",
  "share.privateStrong": "Sonst nichts",
  "share.privateAfter": ": nicht dein Immich, deine anderen Diashows, Dateinamen oder Orte.",
  "share.liveBefore": "Deine Änderungen erscheinen auch hinter dem Link. ",
  "share.liveStrong": "Er gilt, bis du ihn ausschaltest.",
  "share.create": "Link erstellen",
  "share.loading": "Der Link wird gelesen …",
  "share.link": "Link",
  "share.copy": "Kopieren",
  "share.copied": "Kopiert",
  "share.shareVia": "Teilen …",
  "share.openAsViewer": "Als Zuschauer öffnen",
  "share.qrCode": "QR-Code",
  "share.qrCodeLabel": "QR-Code des Links",
  "share.qrStrong": "Mit dem Handy scannen",
  "share.qrAfter":
    ", um dort zuzuschauen – etwa wenn der Fernseher belegt ist oder ein Gast sie auf dem eigenen Handy sehen will.",
  "share.created": "Erstellt am {date}",
  "share.untilOff": "gilt, bis du ihn ausschaltest",
  "share.turnOff": "Link ausschalten",
  "share.done": "Fertig",
  "share.confirmTitle": "Link ausschalten?",
  "share.confirmText":
    "Wer ihn hat, kann „{title}“ dann nicht mehr ansehen. Teilst du die Diashow wieder, bekommt sie einen neuen Link, und dieser bleibt aus.",
  "share.turnedOff": "Link ausgeschaltet",
  "share.homeNetworkStrong": "Dieser Link funktioniert nur in deinem Heimnetz.",
  "share.homeNetworkAfter":
    " Glissando ist hier über eine Adresse im Heimnetz geöffnet. Um mit jemandem außerhalb zu teilen, öffne Glissando über seine öffentliche Adresse und teile von dort.",
  "share.loadFailed":
    "Der Link konnte nicht gelesen werden. Dein Glissando-Server antwortet nicht.",
  "share.createFailed":
    "Der Link konnte nicht erstellt werden. Dein Glissando-Server antwortet nicht.",
  "share.turnOffFailed":
    "Der Link konnte nicht ausgeschaltet werden. Dein Glissando-Server antwortet nicht.",
} as const satisfies Record<string, Message>;
