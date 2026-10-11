# Storage layout

One IndexedDB database, `glissando` (schema version 4; version 1 lacked `imports`, version 2
`focus`, version 3 `beats` — each upgrade only adds its store, existing data stays as it is). A slideshow record holds
`songs` (ADR-0023); one holding a single `music` is not read, and such a database is cleared
by hand:

| Object store | Key      | Value                                                                    |
| ------------ | -------- | ------------------------------------------------------------------------ |
| `slideshows` | `id`     | the slideshow record (`StoredSlideshow`)                                 |
| `pictures`   | media id | display and thumbnail rendition, bytes + type                            |
| `music`      | media id | the music file, bytes + type                                             |
| `imports`    | `id`     | a claim (import in progress or undoable removal): `startedAt`, media ids |
| `focus`      | media id | a picture's `PictureFocus`: its subject box, or none found (ADR-0012)    |
| `beats`      | media id | a track's `MusicBeats`: its beat times and tempo, or none (ADR-0021)     |

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
`"crossfade"`; records without it need no migration. `mediaBytes`
measures what a slideshow's pictures (both renditions) and songs take, in one read-only
transaction, for the export's size estimate. `deleteSlideshow` deletes the
record and, in the same transaction, the media no other slideshow references, those pictures'
focus and those songs' beats with it.

A picture's focus lives beside its media, not on the record: the editors save whole records
from their copy, which would erase a focus found meanwhile. `putPictureFocus` checks for the
picture's media in the same transaction and keeps nothing without it, so a detection finishing
after its slideshow was deleted resurrects nothing; `pictureFocus(ids)` returns a map in which a
picture not looked at yet is absent. A track's beats live beside its media the same way:
`putMusicBeats` keeps nothing without the music, `musicBeats(id)` is `undefined` for a track not
listened to yet.
