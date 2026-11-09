import type { Message } from "./messages.ts";

/** German copy of the video export (dev-docs/VIDEO_EXPORT.md); part of the German catalogue. */
export const deVideo = {
  "videoExport.title": "Video",
  "videoExport.subtitle": "{title} · {duration} · {music}",
  "videoExport.withMusic": "mit Musik",
  "videoExport.withoutMusic": "ohne Musik",
  "videoExport.probing": "Glissando prüft, was dieses Gerät kann …",
  "videoExport.sizes": "Größe",
  "videoExport.use-720p": "Zum Verschicken",
  "videoExport.use-1080p": "Full HD, für Computer, Handy und Tablet",
  "videoExport.use-4k": "4K, für den Fernseher",
  "videoExport.resolution": "{width} × {height}",
  "videoExport.sizeLine": "{resolution} · {use}",
  "videoExport.about": "ca. {size}",
  "videoExport.cannotEncode": "Kann dieses Gerät nicht kodieren",
  "videoExport.spaceTitle": "Der Speicher reicht wohl nicht.",
  "videoExport.spaceText": "Frei sind etwa {free}, „{preset}“ braucht ca. {needed}.",
  "videoExport.spaceFits": "„{preset}“ passt.",
  "videoExport.appleNote":
    "Läuft aus diesem Browser nicht auf iPhone, iPad oder Apple TV. Dafür in Safari erstellen.",
  "videoExport.hint": "Dauert etwa so lange wie die Diashow. Lass Glissando offen.",
  "videoExport.start": "Video erstellen",
  "videoExport.runningTitle": "Video wird erstellt",
  "videoExport.runningSubtitle": "{preset} · {resolution}",
  "videoExport.position": "{at} / {total}",
  "videoExport.frames": "Bild {done} von {total}",
  "videoExport.remaining": "noch etwa {time}",
  "videoExport.runningHint":
    "Du kannst die App wechseln: das Rechnen pausiert und läuft danach weiter.",
  "videoExport.doneTitle": "Video ist fertig",
  "videoExport.fileFacts": "{size} · {duration} · {resolution}",
  "videoExport.savedTitle": "Gespeichert",
  "videoExport.savedText": "dort, wo du es beim Start gewählt hast.",
  "videoExport.finish": "Fertig",
  "videoExport.share": "Teilen …",
  "videoExport.shareHint":
    "„Teilen …“ öffnet das Teilen-Menü: „Video sichern“ legt es in Fotos, außerdem Dateien, AirDrop und Nachrichten. Schließen löscht die Kopie in Glissando.",
  "videoExport.download": "Herunterladen",
  "videoExport.downloadHint": "Schließen löscht die Kopie in Glissando; vorher herunterladen.",
  "videoExport.failedTitle": "Video nicht erstellt",
} as const satisfies Record<string, Message>;
