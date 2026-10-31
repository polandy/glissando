# Copy — the glossary

One word per concept, in every user-facing string, the user guide and the mockups. The English
column is the word in the catalogue `src/app/i18n/catalogue-en*.ts`, the German column its
mirror in `catalogue-de*.ts`. A string that uses another word for one of these concepts is a
defect (UX-14 in `UX_BACKLOG.md`); the sweep that enforces it adds a unit test that greps the
English catalogue for the banned variants.

| Concept                     | English                                        | German                                       | Not                                                   |
| --------------------------- | ---------------------------------------------- | -------------------------------------------- | ----------------------------------------------------- |
| the whole work              | slideshow                                      | Diashow                                      | show, film                                            |
| what goes in                | pictures (and videos where it matters)         | Bilder (und Videos)                          | media, photos                                         |
| a video item                | clip                                           | Clip                                         | video (that is the MP4 export, see "keep & share")    |
| the MP4 export              | video                                          | Video                                        | clip, film                                            |
| one piece of music          | song                                           | Song                                         | track, title, soundtrack                              |
| all the music               | music                                          | Musik                                        | playlist, soundtrack                                  |
| the automatic value, state  | Automatic                                      | Automatisch                                  | Default, Own, Custom, "own choice"                    |
| reset to it, action         | Back to automatic                              | Zurück auf Automatisch                       | Reset, Default, "Back to crossfade / None / levelled" |
| time per picture            | Picture length                                 | Bilddauer                                    | Duration, Picture times, seconds per picture          |
| taking away, reversible     | Remove                                         | Entfernen                                    | Discard, Clear                                        |
| taking away, for good       | Delete (a slideshow only)                      | Löschen (nur eine Diashow)                   | Remove                                                |
| parking a picture           | Set aside / Take in                            | Beiseitelegen / Aufnehmen                    | Remove, hide                                          |
| keep & share, the entry     | Share                                          | Teilen                                       | Export                                                |
| keep & share, the actions   | Save                                           | Speichern                                    | Export, "Exporting…", "Export failed"                 |
| the server                  | Glissando server                               | Glissando-Server                             | server, backend                                       |
| made smaller for a device   | downscaled                                     | verkleinert                                  | downsized, downscales                                 |
| the full-screen view        | Full screen                                    | Vollbild                                     | Fullscreen, View full screen                          |
| the part of a clip or song  | Excerpt                                        | Ausschnitt                                   | Trimmed, clip (for music), Cut                        |
| the transition without fade | Hard cut                                       | Harter Schnitt                               | Cut (collides with the excerpt)                       |
| the settings fold           | More settings                                  | Weitere Einstellungen                        | Fine settings                                         |
| the originals               | pictures ("your pictures stay where they are") | Bilder ("deine Bilder bleiben, wo sie sind") | photos, originals                                     |

Rules beyond the table:

- The word stays the same across screens, toasts, dialogs and the user guide; a concept is
  never introduced under a second name "for variety".
- A button says the outcome ("Save", "Remove"), never the mechanism ("Export", "Clear").
- German keeps the English loan words the table lists (Clip, Song) and compounds the rest with a
  hyphen (Glissando-Server).
- Jargon (codec names, BPM, dB, pixel sizes) and mechanics explanations are their own items,
  UX-15 and UX-16 in `ux_backlog/copy.md`.
