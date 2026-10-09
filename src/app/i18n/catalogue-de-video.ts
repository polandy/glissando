import type { Message } from "./messages";

/** German copy of the video export (dev-docs/VIDEO_EXPORT.md); part of the German catalogue. */
export const deVideo = {
  "slideshow.saveAsVideo": "Als Video sichern",
  "videoExport.title": "Als Video sichern",
  "videoExport.subtitle": "{title} · {duration} · {music}",
  "videoExport.withMusic": "mit Musik",
  "videoExport.withoutMusic": "ohne Musik",
  "videoExport.probing": "Glissando prüft, was dieses Gerät kann …",
  "videoExport.sizes": "Größe",
  "videoExport.preset-720p": "Klein",
  "videoExport.preset-1080p": "Standard",
  "videoExport.preset-4k": "Groß",
  "videoExport.use-720p": "Zum Verschicken",
  "videoExport.use-1080p": "Für Rechner, Telefon und Tablet",
  "videoExport.use-4k": "Für den Fernseher",
  "videoExport.resolution": "{width} × {height}",
  "videoExport.about": "ca. {size}",
  "videoExport.cannotEncode": "Kann dieses Gerät nicht kodieren",
  "videoExport.container": "MP4",
  "videoExport.videoCodec": "H.264",
  "videoExport.audio-aac": "AAC",
  "videoExport.audio-opus": "Opus",
  "videoExport.frameRate": "{fps} Bilder/s",
  "videoExport.opusTitle": "Der Ton wird Opus.",
  "videoExport.opusText":
    "Dieser Browser kann kein AAC kodieren. Das Video läuft am Rechner, in VLC und auf Android, aber nicht auf iPhone, iPad und Apple TV. Für Apple-Geräte in Safari oder Chrome unter Windows/macOS sichern.",
  "videoExport.spaceTitle": "Der Speicher reicht wohl nicht.",
  "videoExport.spaceText": "Frei sind etwa {free}, „{preset}“ braucht ca. {needed}.",
  "videoExport.spaceFits": "„{preset}“ passt.",
  "videoExport.hint":
    "Glissando rechnet jedes Bild einzeln, das dauert je nach Gerät etwa so lange wie die Diashow. Glissando muss dabei offen bleiben; der Bildschirm bleibt an.",
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
  "videoExport.storageFullTitle": "Der Speicher des Geräts ist voll.",
  "videoExport.storageFullText":
    "Bei Bild {frame} von {total} war kein Platz mehr. Die angefangene Datei ist gelöscht. Es fehlen etwa {missing}; mit „Klein“ oder nach dem Aufräumen des Geräts klappt es.",
  "videoExport.otherSize": "Andere Größe wählen",
  "videoExport.failedText":
    "Beim Erstellen ging etwas schief. Die angefangene Datei ist verworfen.",
  "videoExport.unsupportedTitle": "Dieser Browser kann keine Videos erstellen.",
  "videoExport.unsupportedText":
    "Dafür braucht Glissando WebCodecs. Es geht in aktuellem Chrome, Edge, Firefox und Safari (auch auf iPhone und iPad).",
} as const satisfies Record<string, Message>;
