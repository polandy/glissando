import type { Message } from "./messages";

/**
 * German copy of the web page export (dev-docs/HTML_EXPORT.md): the sheet, and the exported
 * page's own words (`htmlPage.*`), written into the page at export time.
 */
export const deHtml = {
  "slideshow.saveAs": "Speichern als",
  "slideshow.saveVideo": "Video",
  "slideshow.saveWebPage": "Webseite",
  "slideshow.saveAsWebPage": "Als Webseite sichern",
  "htmlExport.title": "Als Webseite sichern",
  "htmlExport.subtitle": "{title} · {duration} · {music}",
  "htmlExport.withMusic": "mit Musik",
  "htmlExport.withoutMusic": "ohne Musik",
  "htmlExport.sizes": "Bildgröße",
  "htmlExport.size-small": "Klein",
  "htmlExport.size-sharp": "Scharf",
  "htmlExport.size-4k": "4K",
  "htmlExport.use-small": "Zum Verschicken in einer Nachricht",
  "htmlExport.use-sharp": "Für Rechner und Tablet",
  "htmlExport.use-4k": "Für den Fernseher",
  "htmlExport.longEdge": "{pixels} px",
  "htmlExport.about": "ca. {size}",
  "htmlExport.compare": "Größe im Vergleich zum Video",
  "htmlExport.compareWebPage": "Webseite",
  "htmlExport.compareVideo": "Video 1080p",
  "htmlExport.chipFile": "eine .html-Datei",
  "htmlExport.chipOffline": "läuft offline",
  "htmlExport.chipContent": "Musik, Untertitel, Ken Burns",
  "htmlExport.bigTitle": "Zu groß für eine E-Mail.",
  "htmlExport.bigText":
    "Kopiere sie auf den Rechner am Fernseher oder einen USB-Stick, oder teile sie über einen Cloud-Ordner.",
  "htmlExport.hint":
    "Läuft in jedem aktuellen Browser auf Rechner, Handy oder Tablet, ohne Internet und ohne Glissando. Die Bilder werden verkleinert; die Originale bleiben hier.",
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
  "htmlExport.failedText":
    "Beim Erstellen ist etwas schiefgegangen. Die unfertige Datei ist verworfen.",
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
