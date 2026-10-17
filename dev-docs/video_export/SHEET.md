# Sheet

"Als Video sichern" in the header's ⋯ menu, above "Als Webseite sichern" (HTML_EXPORT.md) and
"Als Glissando-Datei sichern", opens `VideoExportSheet`: a dialog on desktop, a bottom sheet below 720 px. The sheet's frame (`export-sheet/ExportDialog`),
size radios, file row and saved note are shared with the web page export.

| State            | Content                                                                                                                                                                                                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| choose           | Title "Als Video sichern", subtitle "<title> · <duration> · mit Musik"; three preset radios with size; chips `MP4 · H.264 · AAC/Opus · 30 Bilder/s`; Opus note (lemon); space note (lemon); hint "Glissando rechnet jedes Bild einzeln …"; Abbrechen / Video erstellen |
| running          | The last encoded frame as a preview with "2:15 / 5:40"; a mint progress bar; "Bild 4.067 von 10.200"; "noch etwa 3:24" (elapsed per frame × frames left, from an injected clock); only "Abbrechen"                                                                     |
| done             | File row (thumbnail, name, size, duration, resolution). With the picker: mint "Gespeichert", "Fertig". With `navigator.canShare({ files })`: "Teilen …" (share sheet). Otherwise "Herunterladen". Plus "Schließen"                                                     |
| storage-full     | Coral note: at which frame space ran out, the partial file deleted, how much is missing; "Andere Größe wählen" (back to choose, 720p selected) / "Schließen"                                                                                                           |
| failed           | Coral note with the error; "Schließen"                                                                                                                                                                                                                                 |
| unsupported      | The capability copy above; "Schließen"                                                                                                                                                                                                                                 |
| clip-unsupported | Warning note "Clip n cannot be exported." (German: "Clip n lässt sich nicht exportieren."), n counting the show's video slides; "Schließen"                                                                                                                            |

- While running, the screen is kept awake (`navigator.wakeLock`, requested again on
  `visibilitychange` when visible). A hidden page pauses the work, which the export's own time
  makes harmless.
- "Abbrechen" stops at once: the encoders are closed, the muxer aborts the writable, and the
  OPFS file is deleted. With the picker, only the writer is aborted: File System Access writes
  into a swap file that only `close()` commits, so a file the user chose to overwrite keeps its
  old content and a new name stays the empty file the picker created, which a browser cannot
  delete.
- One export at a time; the sheet is modal while running. While running, ✕ reads "Abbrechen"
  and Esc cancels too; a tap on the scrim closes the sheet only where nothing is lost (not while
  running, not once done). Closed, focus goes back to "Video".
- While the browser is being probed, the sheet shows "Glissando prüft, was dieses Gerät kann …".
  A probe or a target that fails shows as failed.
- Below the done file row: with "Teilen …" the hint on the share menu, with "Herunterladen"
  "Schließen löscht die Kopie in Glissando; vorher herunterladen." A dismissed share sheet is no
  error.
- A refused wake lock (e.g. battery saver) is logged; the export runs on without it.
