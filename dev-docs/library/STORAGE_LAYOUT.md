# Storage layout

One IndexedDB database, `glissando` (schema version 8; version 1 lacked `imports`, version 2
`focus`, version 3 `beats`, version 5 cleared the slideshow records for the picture colours
(ADR-0033), version 6 added `videos`, version 7 added `loudness`, version 8 dropped and recreated
`focus` so every picture, including one stored as "none" before objects or scenery, is looked at
by the current detector (ADR-0041) — each other upgrade only adds its store, existing data stays
as it is). A slideshow record holds `songs` (ADR-0023); one holding a single `music` is not read,
and such a database is cleared by hand:

| Object store | Key      | Value                                                                                                                                       |
| ------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `slideshows` | `id`     | the slideshow record (`StoredSlideshow`)                                                                                                    |
| `pictures`   | media id | display and thumbnail rendition, bytes + type                                                                                               |
| `music`      | media id | the music file, bytes + type                                                                                                                |
| `imports`    | `id`     | a claim (import in progress or undoable removal): `startedAt`, media ids                                                                    |
| `focus`      | media id | a picture's `StoredFocus`: its `PictureFocus` (subject box, scenery, or none, ADR-0012) and the `detector` version that found it (ADR-0041) |
| `beats`      | media id | a track's `MusicBeats`: its beat times and tempo, or none (ADR-0021)                                                                        |
| `videos`     | media id | a video's original file as chosen, bytes + type (ADR-0034)                                                                                  |
| `loudness`   | media id | a track's `MusicLoudness`: its measured integrated loudness (dev-docs/library/MUSIC.md)                                                     |

Media is written while importing, the slideshow record last. Edits on the slideshow screen
replace the record through `updateSlideshow`, which reads it in the same transaction and throws
`SlideshowNotFoundError` when it is gone (`updateSlideshowWith(id, edit)` does the same with a pure
edit of the record as stored), so an edit (or an Undo) from a tab still showing a
slideshow deleted elsewhere never brings it back; that tab goes back to start with the toast
"This slideshow no longer exists." `ownOrder` marks pictures the user reordered. A picture's
optional `kenBurns` (`{ from, to }`, two framings as in the player's JSON: zoom 1 to
`MAX_OWN_KEN_BURNS_ZOOM` = 3, centre 0..1) is its own motion from the picture editor; absent, the
motion is automatic (ADR-0006). `setPictureKenBurns` validates it before it is stored
(`checkOwnKenBurns`, failing loud with the field and value); records without it need no
migration. A picture's optional `caption` is the one line shown with it in the player, stored
as `normalizeCaption` leaves the typed text (`setPictureCaption`: whitespace runs become one
space, trimmed, at most 80 characters counted in graphemes; nothing left deletes the field). A
picture's optional `durationMs` is how long it shows (whole ms, 2000 to 15000 in steps of 500)
and its optional `transition` how it hands over to the next picture (one of
`TRANSITION_CHOICES`: the player's six effects or `"cut"`); absent, each is automatic and no
transition length is ever stored (ADR-0008). A picture's optional `immichAssetId` or `fileBytes`
(a positive whole number) is its origin (ADR-0016); records without them need no migration. `setPictureDuration` and `setPictureTransition`
validate them (`checkOwnDurationMs`, `checkTransitionChoice`) and delete the field for
`undefined`; records without them need no migration. The slideshow's optional `transition` is
the default every picture without its own plays (one of `SLIDESHOW_TRANSITIONS`: a picture's
choices or `"alternate"`); absent, it is the crossfade (ADR-0010). `setSlideshowTransition`
validates it (`checkSlideshowTransition`) and deletes the field for `undefined` or
`"crossfade"`; records without it need no migration. The slideshow's optional `look` is its colour grade (one of
`SLIDESHOW_LOOKS` other than `"none"`; ADR-0044); absent, it is none. `setSlideshowLook` validates
it (`checkSlideshowLook`) and deletes the field for `"none"`. A picture's optional `video` (`StoredVideo`: `mediaId`, `sourceMs`,
`startMs`, `endMs`, `volume` 0 to 100 in steps of 5, `duckMusic` only ever `false`) makes it a video
slide, its picture the poster; the file lives in `videos` under `mediaId` (`putVideo`, `videoBlob`).
`setVideoExcerpt`, `setVideoVolume` and `setVideoDuckMusic` validate (`checkVideoExcerpt`,
`checkVideoVolume`, failing loud with the field and value); `MAX_VIDEO_BYTES` (1 GiB) bounds a
source at import. `mediaBytes`
measures what a slideshow's pictures (both renditions), videos and songs take, in one read-only
transaction, for the export's size estimate. `deleteSlideshow` deletes the
record and, in the same transaction, the media (videos included) no other slideshow references, those pictures'
focus and those songs' beats and loudness with it.

A picture's focus lives beside its media, not on the record: the editors save whole records
from their copy, which would erase a focus found meanwhile, and `FocusPass`'s store port cannot
write a slideshow record at all (ADR-0041). `putPictureFocus(id, { focus, detector })` checks for
the picture's media in the same transaction and keeps nothing without it, so a detection finishing
after its slideshow was deleted resurrects nothing; it writes whatever `detector` it is given, so
only `FocusPass` — which always looks with the current `FOCUS_DETECTOR_VERSION` — keeps a result
from ever regressing to an older one. `pictureFocus(ids)` returns a map in which a picture not
looked at yet is absent. A track's beats live beside its media the same way:
`putMusicBeats` keeps nothing without the music, `musicBeats(id)` is `undefined` for a track not
listened to yet.
