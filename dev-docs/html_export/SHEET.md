# Sheet

The Share sheet's "Webseite" row (page icon, group "Kopie sichern", share_link/IN_THE_APP.md) opens
`HtmlExportSheet`, titled "Webseite": a dialog on desktop, a bottom sheet
below 720 px. Its Back control (not shown while the export runs) returns to the Share sheet; Close
closes the whole flow. Its states follow the video sheet's (VIDEO_EXPORT.md):

| State   | Content                                                                                                                                                                                                                                                                                                                      |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| choose  | Title "Webseite", subtitle "<title> · <duration> · mit Musik"; three size radios with the estimate; a bar comparing the estimate with the 1080p video's; chips `eine .html-Datei · läuft offline · Musik, Untertitel, Ken Burns`; the 4K note; the hint "Läuft in jedem aktuellen Browser …"; Abbrechen / Webseite erstellen |
| running | One thumbnail per picture, lit once that picture is done; a mint progress bar; "Bild 12 von 50"; the bytes so far; only "Abbrechen"                                                                                                                                                                                          |
| done    | File row (first picture, name, size, duration, size id). The video sheet's targets (picker: "Gespeichert" + "Fertig"; share: "Teilen …"; else "Herunterladen") plus "Öffnen", which opens the page in a new tab                                                                                                              |
| failed  | Coral note with the error; "Schließen"                                                                                                                                                                                                                                                                                       |

- **Clips**: a slideshow with video slides shows a lemon note beneath the comparison, "Videoclips
  in der Show: n. Sie kommen unverkleinert in die Datei, daher ist die Seite in jeder Größe etwa
  X groß." The size is the selected estimate, so the file size is named before the start.
- **Estimate**: each stored display picture's byte count is its Blob's size, which IndexedDB
  knows without reading the bytes; every song's likewise, also one the slideshow may not reach,
  so the estimate errs on the large side; each distinct clip's likewise, once, whole. The page bytes are the player bundle's
  (`playerBundleBytes`), so opening the sheet loads the bundle, which also fetches it before the
  start. Until both are known the sizes show no estimate; if either fails, the sheet shows
  failed. The comparison's full bar is the 1080p video's estimate (VIDEO_EXPORT.md).
- The done file row's facts are "16 MB · 4:10 · 1280 px" (the size's long edge).
- **Target**: as the video export: with `showSaveFilePicker`, "Webseite erstellen" opens it (type
  `text/html`, suggested name `<title>.html`), and dismissing it returns to choose. Elsewhere the
  page is built as a Blob in memory and handed to share or download.
- "Öffnen" opens the finished file through a `blob:` URL in a new tab. A picked file is read
  back from disk (`FileSystemFileHandle.getFile()`), a page built in memory is its Blob, so the
  page is never held twice. The URL is revoked when the sheet closes; a tab that has loaded the
  page keeps it.
- "Abbrechen" stops before the next picture (an `AbortSignal`), and a picked file
  is left as it was: its writer is aborted, and File System Access commits only on `close()`.
  Esc and ✕ cancel while running; a tap on the scrim closes the sheet only in choose and failed.
  Closed, focus goes back to "Webseite".
