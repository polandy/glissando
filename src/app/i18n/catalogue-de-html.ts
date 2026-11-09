import type { Message } from "./messages.ts";

/**
 * German copy of the web page export (dev-docs/HTML_EXPORT.md): the sheet, and the exported
 * page's own words (`htmlPage.*`), written into the page at export time.
 */
export const deHtml = {
  "htmlExport.title": "Webseite",
  "htmlExport.subtitle": "{title} · {duration} · {music}",
  "htmlExport.withMusic": "mit Musik",
  "htmlExport.withoutMusic": "ohne Musik",
  "htmlExport.sizes": "Bildgröße",
  "htmlExport.use-small": "Zum Verschicken in einer Nachricht",
  "htmlExport.use-sharp": "Full HD, für Rechner und Tablet",
  "htmlExport.use-4k": "4K, für den Fernseher",
  "htmlExport.sizeLine": "{pixels} px · {use}",
  "htmlExport.about": "ca. {size}",
  "htmlExport.compare": "Größe im Vergleich zum Video",
  "htmlExport.compareWebPage": "Webseite",
  "htmlExport.compareVideo": "Video 1080p",
  "htmlExport.bigTitle": "Zu groß für eine E-Mail.",
  "htmlExport.bigText":
    "Kopiere sie auf den Rechner am Fernseher oder einen USB-Stick, oder teile sie über einen Cloud-Ordner.",
  "htmlExport.hint":
    "Läuft in jedem Browser, offline. Bilder werden verkleinert; die Originale bleiben hier.",
  "htmlExport.clipsNote": {
    one: "Der Clip kommt ganz hinein, darum ändert sich die Größe mit der Bildgröße kaum.",
    other:
      "Die {count} Clips kommen ganz hinein, darum ändert sich die Größe mit der Bildgröße kaum.",
  },
  "htmlExport.start": "Webseite erstellen",
  "htmlExport.runningTitle": "Die Webseite entsteht",
  "htmlExport.runningSubtitle": "{size} · {pixels} px",
  "htmlExport.pictures": "Bild {done} von {total}",
  "htmlExport.doneTitle": "Die Webseite ist fertig",
  "htmlExport.fileFacts": "{size} · {duration} · {pixels} px",
  "htmlExport.savedTitle": "Gespeichert",
  "htmlExport.savedText": "wo du es beim Start gewählt hast.",
  "htmlExport.finish": "Fertig",
  "htmlExport.open": "Öffnen",
  "htmlExport.share": "Teilen …",
  "htmlExport.shareHint":
    "„Teilen …“ öffnet das Teilen-Menü: Mail, Nachrichten, AirDrop, Dateien. Schließen löscht die Kopie in Glissando.",
  "htmlExport.download": "Herunterladen",
  "htmlExport.downloadHint": "Schließen löscht die Kopie in Glissando; vorher herunterladen.",
  "htmlExport.failedTitle": "Webseite nicht erstellt",
  "htmlPage.eyebrow": "Diashow",
  "htmlPage.summary": "{pictures} · {duration} · {music}",
  "htmlPage.madeWith": "Erstellt mit Glissando · läuft offline",
  "htmlPage.play": "Abspielen",
  "htmlPage.pause": "Pause",
  "htmlPage.mute": "Ton aus",
  "htmlPage.unmute": "Ton an",
  "htmlPage.fullScreen": "Vollbild",
  "htmlPage.timeline": "Zeitleiste",
  "htmlPage.playAgain": "Nochmal abspielen",
  "htmlPage.cannotPlay": "Diese Diashow lässt sich hier nicht abspielen.",
  "htmlPage.noscript":
    "Diese Diashow braucht JavaScript. Öffne die Datei in einem Browser wie Safari, Chrome oder Firefox.",
} as const satisfies Record<string, Message>;
