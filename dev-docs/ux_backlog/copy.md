# UX backlog — Copy and terminology

Back to [UX_BACKLOG.md](../UX_BACKLOG.md). Catalogue: `src/app/i18n/catalogue-en*.ts`
(28 files, 1225 keys), German mirrors each key. Copy items need no mockup; the PR shows a
before/after table and updates `docs/user-guide.md` where a term changes.

### UX-14 One thing, several names (size M)

Problem — The same concept is named differently across screens:

| Concept            | Names in use                                                                                | Pick one                                                          |
| ------------------ | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| the whole work     | slideshow, show ("plays in the show"), film ("In the film")                                 | slideshow                                                         |
| what goes in       | pictures, media ("Choose media", "Add media"), photos (Immich, delete)                      | pictures (and videos where it matters)                            |
| a video item       | video, clip ("Clip N", clip editor), "Video clips"; MP4 export is also "Video"              | clip for the item, video for the export                           |
| music              | song, track, music, soundtrack, playlist; "Add a song" vs "Add music"                       | song (item), music (the whole)                                    |
| reset to automatic | Default, default, Automatic, Own, Custom, "own choice", Back to crossfade / None / levelled | Automatic (state), "Back to automatic" (action)                   |
| time per picture   | Duration, Picture times, Picture length, seconds per picture, per picture                   | Picture length                                                    |
| taking away        | Remove, Delete, Discard, Clear, Set aside / Take in                                         | Remove (reversible), Delete (slideshow only), keep Set aside      |
| keep & share       | Share (button), Export (toasts "Exporting…", "Export failed"), Save file                    | Share for the entry, "Save" for the actions, never "Export" in UI |
| the server         | Glissando server, server, Glissando backend                                                 | Glissando server                                                  |
| downscale          | downsized, downscales, downscaled                                                           | downscaled                                                        |
| full screen        | Fullscreen (F), Full screen, View full screen                                               | Full screen                                                       |
| music cut          | Excerpt (clip), Trimmed (music); "Cut" is also a transition                                 | Excerpt for both; rename the transition "Hard cut"                |
| the settings fold  | Fine settings                                                                               | More settings                                                     |
| the originals      | "Your original photos stay where they are" (delete dialog), pictures elsewhere              | pictures                                                          |

Where — the strings named in the table; e.g. `videoExport.clipUnsupportedText`,
`htmlExport.clipsTitle`, `clip.inFilm`, `import.pickPictures`, `add.title`,
`import.soundtrackTitle`, `transitions.default`, `glissandoFile.*`, `immich.problemUnreachable`.

Why — Consistency is the cheapest usability win; a user who meets "media", "pictures" and
"photos" wonders whether they differ.

Proposal — The glossary is `dev-docs/COPY.md` (chosen word per concept, English and German,
shipped by P0); sweep the catalogue against it; add a unit test that greps the English
catalogue for the banned variants.

Done when — The banned-variant test passes; the user guide uses the glossary's words.

### UX-15 Jargon in user-facing strings (size M)

Problem — Non-technical users meet: Ken Burns, BPM ("105 BPM" chip), dB ("Levelled by
{levelDb}"), levelled / unlevelled, distortion ("As loud as it gets without distortion"),
crossfade, "drop or chorus", phrases; H.264, AAC, Opus, MP4, fps, WebCodecs, decode / encode,
HEIC / WebP, 1080p, 4K, "1440 pixels", "pixels on its short edge"; backend, self-hosted,
API scope names ("album.read, asset.read …"), localhost, Caddy, Tailscale; CC BY-NC 4.0,
glissando.json, index.html, "renders every frame", "Older detection".

Where — Mood sheet summary, music editor Volume and Picture changes, Video / Web page sheets
(codec chips), Settings quality, Immich notices, the picture editor's transition hint.

Why — Each term is a stop for the reader; none changes what they should do.

Proposal — Three buckets. (1) Replace with plain words: Ken Burns → "motion", BPM → "beat",
Levelled → "Same volume as the other songs", distortion line → drop. (2) Keep but hide behind
Details / ⓘ: codec chips, pixel sizes (show "Full HD", "4K" as labels only). (3) Keep as is
where it is an identifier the user must recognise (file names like `glissando.json` inside the
file-page text, licence names). Immich scope names move to the self-hosting doc, the notice
says "The key lacks permissions, see the setup guide".

Done when — The listed strings are gone from the catalogue or moved to bucket 2/3 with a
reason in the PR; the user guide does not introduce "Ken Burns" before "motion".

### UX-16 Strings that explain mechanics instead of outcomes (size S)

Problem — e.g. "− and + make it this picture's own", "{share} % of the picture's time, at
most {max} s", "Takes 0.6 s at the end of picture 4: 30 % of the picture's time, at most 1 s",
"Order by capture date · Ken Burns · transitions", "found by an older version",
`videoExport.hint` ("Glissando renders every frame one by one…"), `prepare.*`,
`settings.playbackQualityAutoHint`, `portrait.hintAutomatic`, `focusSheet.lookingAgainHint`;
the Faces and subjects legend "Nothing found · 21" (`focusSheet.statusNone`), which reads as a
failure although it means "21 pictures with no face, shown whole"; the Portrait pictures sheet's
three-paragraph explanation of what each option does to the frame.

Why — The user needs to know what will happen, not how the app arrives at it; a count next to
"Nothing found" sounds like an error report.

Proposal — Rewrite each as one outcome sentence or delete; the transition hint becomes
"Crossfade, 0.6 s" and nothing else. Overlaps with UX-10 for the music editor strings.

Done when — Each listed key is rewritten or removed; no helper string exceeds one sentence.

### UX-17 Raw error text reaches the user (size S)

Problem — `VideoExportSheet.svelte:151` and `HtmlExportSheet.svelte:125` render
`view.error.message` verbatim; the standalone file page shows "glissando.json can't be read:
{reason}" with the parser's reason.

Why — "Errors sit at their cause, in user language, with a way out."

Proposal — Map known failure classes (storage full, clip unsupported, browser unsupported,
cancelled, unknown) to user sentences with an action (Try again, Choose a smaller size); log
the raw message to the console only. The file page: "This file is damaged. Try the original
file again." plus a "Show details" fold for the reason.

Done when — No component renders an `Error.message` directly (grep test in `npm run verify`
or a unit test on the mapping); each failure class has a string and an action.
