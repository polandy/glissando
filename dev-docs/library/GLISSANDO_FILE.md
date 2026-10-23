# The .glissando file

One slideshow as one file, to move it between devices (`src/glissando-file/`). A ZIP; the export
stores its entries, not compressed, in the order of the table, and any unzip tool opens it. No
ZIP64, so it stays under 4 GiB and 65,535 entries. Glissando also opens a copy a ZIP tool packed
again (`zip-reader.ts`, `entry-layout.ts`): entries stored or deflated (unpacked with
`DecompressionStream("deflate-raw")`), in any order. Every opened file is foreign and possibly
hostile (ADR-0038):

| Entry                   | Content                                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `glissando.json`        | first, as the export writes it, indented: `format` "glissando", `formatVersion` 17, the `slideshow`                  |
| `glissando.schema.json` | next: a JSON Schema (draft-07) of `glissando.json` at the current `formatVersion`                                    |
| `README.txt`            | next: English plain text saying what the file is and what each entry holds                                           |
| `index.html`            | next: a player for the unpacked folder (`src/file-page/`, ADR-0038, [GLISSANDO_FILE_IO](GLISSANDO_FILE_IO.md))       |
| `pictures/0001.jpg` …   | the display renditions in play order, as stored (numbered from 0001)                                                 |
| `thumbnails/0001.jpg`…  | their thumbnails, as stored                                                                                          |
| `music/track-<n>.<ext>` | the playlist's n-th song (from 1), extension from its file name (none when it has none)                              |
| `videos/clip-<n>.<ext>` | the n-th distinct clip a video slide plays (from 1, by first use), extension the type's subtype (`quicktime`: `mov`) |

`slideshow` is the stored record without device ids: `title`, `createdAt`, `secondsPerPicture`,
`pictureLength` (only when set), `ownOrder` (only when true), `transition` (only when not the crossfade), `portraitPictures` (only when set, ADR-0028), `openingCard` and `closingCard` (only when set, ADR-0032, [TITLE_SLIDES](../app/slideshow-editing/TITLE_SLIDES.md); a card picture is named by its index in `pictures`), `automaticChaptersOff` (when true), `chapterEdits`, `addedChapters` (when set, [TRIP_CHAPTERS](../player/TRIP_CHAPTERS.md)), `pictures` (`file`, `thumbnail`, `capturedAt`, `width`, `height`,
`fileName`, `colours` (`veil` and `accent`, ADR-0033), `kenBurns` for a picture with an own motion, `caption` for one with a caption,
`durationMs` and `transition` for one with an own duration or transition, `immichAssetId` or
`fileBytes` where known, `alone` for one never composed into a pair, `video` for a video slide: the clip's `file` and `mimeType`, its `sourceMs`, the excerpt `startMs` and `endMs`, and `volume` and `duckMusic: false` where set, ADR-0034; slides playing one clip name one file, which is stored once), `place` for a picture whose GPS resolved to a bundled place (`name`, `latitude`, `longitude`: the place's own coordinates, not the picture's, ADR-0043), `songs` (in play order, empty without music; each `file`, `fileName`, `durationMs` in whole ms, `mimeType`, and `trim`, `fadeInMs`, `fadeOutMs`, `pictureChanges`, `volumeDb` (whole dB off the levelled
default, -12 to 6, ADR-0040) and `sampleTrack` (the id of one of Glissando's sample tracks, lowercase
letters, digits and hyphens, which credits it as "Music: Glissando, CC BY-NC 4.0", ADR-0042) where set) and `betweenSongs` (only when set). Picture types follow
the extension (`jpg`, `png`, `webp`). No picture's focus travels in the file: the receiving
device looks for it itself (ADR-0012). The manifest is read strictly: an unknown key or a value
out of range makes the file damaged. Versions 13 to 17 are read (version 13 has no `video`; version 14 added it with the `videos/` entries, ADR-0034; version 15 added a song's own `volumeDb`, ADR-0040; version 16 a song's `sampleTrack`, ADR-0042; version 17 a picture's `place`, ADR-0043, and trip chapters, [TRIP_CHAPTERS](../player/TRIP_CHAPTERS.md)); a file
of an older version is damaged. An own duration, transition, default transition, excerpt, fade or picture changes is checked as on the edit; the reason
names its path and value. A caption must be what `normalizeCaption` leaves (1 to 80 characters counted in graphemes, one line, no
leading, trailing or repeated whitespace); the reason names its path and value.

`glissando.schema.json` (`manifest-schema.ts` and its siblings) is built from the same constants
`readManifest` checks against, so the two cannot drift apart; `manifest-schema.test.ts` and its
siblings keep them in sync by running both over one table of manifests. A few rules it cannot
express stay reader-only, and are named in the schema's own `description` and proved by
`manifest-schema-reader-only.test.ts`: a repeated song path, a card background's `pictureIndex`
past the picture count, two clips sharing a file but not a `mimeType`, a date-time that matches
the pattern but not a real calendar time, a caption, card or chapter text over 80 graphemes
(their whitespace rule is in the schema), a music trim past its track's `durationMs`, a video
excerpt under 500 ms, and a chapter's picture index past the picture count or repeated.

Export, the check before a file is stored, write, and `index.html`:
[GLISSANDO_FILE_IO](GLISSANDO_FILE_IO.md).
