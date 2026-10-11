# LIBRARY.md — Import and storage on the device

Pictures and music are imported into the browser's storage on the device; nothing leaves it
unless the user exports a slideshow as a file. Code: `src/import/` (reading files),
`src/library/` (storing them), `src/glissando-file/` (the `.glissando` file). Storage choice:
ADR-0003; file container: ADR-0004.

| Section                                                      | What it covers                                                                |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| [Importing pictures](library/IMPORTING.md)                   | Accepted files, downscaling, capture date, order, Immich, duplicates, culling |
| [Step 1 — the picture import](library/PICTURE_IMPORT.md)     | `PictureImport`'s state and errors as files are processed                     |
| [Music](library/MUSIC.md)                                    | The playlist, trim and fades, picture timing with music                       |
| [Storage layout](library/STORAGE_LAYOUT.md)                  | The IndexedDB schema and what each edit stores                                |
| [Looking for the focus](library/FOCUS_SEARCH.md)             | `FocusPass` finding a picture's subject in the background                     |
| [Listening for the beats](library/BEAT_LISTENING.md)         | `BeatPass` finding a song's beats in the background                           |
| [Abandoned imports and claims](library/ABANDONED_IMPORTS.md) | Claims on media and the clean-up of what nothing references                   |
| [The .glissando file](library/GLISSANDO_FILE.md)             | The ZIP container, its manifest, export, validation and write                 |
| [Persistent storage](library/PERSISTENT_STORAGE.md)          | Asking the browser not to evict storage                                       |
