# In the app

## Availability

`ServerLibraryAvailability` (`src/server-library/`) asks `./api/library` whenever Immich's
availability answers (not while it is `checking` or `offline`). The server library is **on** when
that answers the discovery and Immich is available; **offline** when the device is offline
(Immich's `offline`: the Glissando server is out of reach) and the last answer this session was
the discovery; otherwise **off**; **checking** until Immich and the first discovery have answered.
A discovery that cannot reach the server keeps the last answer; of two under way, the later one
counts. Off, nothing below shows and the app is as without this feature.

## What this device remembers

`ServerLibraryMemory` (`src/server-library/server-library-memory.ts`) keeps in `localStorage`,
fail-soft (a device whose storage refuses remembers nothing):

- whether the server library was on at the last answer (`glissando.serverLibrary`), so a cold
  start without the network shows the server section **offline** rather than hiding it;
- the last server list's cards (id, title, picture count, duration, music), which that offline
  section shows greyed out;
- where the last new slideshow went (`glissando.newSlideshowHome`), the wizard's first choice.

## Library (start screen)

- With the server library on or offline, the library has two sections: "On this device" (the
  device's slideshows, the "Library" eyebrow and "Open file" above it) and "On your Glissando
  server", each its own grid; the dashed "New slideshow" card ends the server grid. Server cards
  carry a chip "Server" at the cover's top left. Covers are Immich thumbnails.
- Under the server heading one muted line: "Pictures stay in Immich. Shared by everyone who opens
  this Glissando." Offline: "Offline. Server slideshows play again once this device reaches your
  Glissando server. To take one along, open it and choose “Keep a copy on this device”." — the
  cards greyed out, not opening, with the line "Needs your Glissando server".
- No server slideshow yet: the section shows only its heading, the line and the dashed card.
- No slideshow on the device: under "On this device" the muted line "Nothing on this device
  yet." instead of its grid.

## Where a new slideshow lives

With the server library on, the pictures step shows above everything a group "Where should it
live?" with two options: "This device" ("Pictures are downloaded and stored here. Plays
offline.") and "Glissando server" ("Pictures stay in Immich. Plays on every device at home,
online."); the last choice is remembered per device, "This device" by default. Once a picture is
in, both are disabled with "Chosen for this slideshow. Clear the pictures to change it." Not on:
no group, the step as before.

**Glissando server** chosen: the "From Immich" box comes first with "Open Immich" as the primary
button; the device drop zone is disabled with "A server slideshow only links photos from Immich.
Upload these to Immich first, or save this slideshow on this device." The "Open file" box is not
offered, and photos skipped as duplicates stay skipped (no "Add anyway"). Picked photos join at once
(no downscaling; tiles are Immich thumbnails) with the mint notice "Linked from Immich. Nothing is
downloaded now; playing loads the pictures from Immich." Duplicates are skipped as before
(ADR-0016). The music step is unchanged; "Create slideshow" uploads each song's music, then
creates the document, under the overlay "Saving on your Glissando server …". A failure keeps the
wizard as it was with a coral toast naming it and "Try again".

## A server slideshow's screen

- The info panel gains a row under "Play": the server glyph, "On your Glissando server", below it
  "Pictures linked from Immich · edits saved for everyone", right a status: "Saved" (mint dot),
  "Saving …" while an edit is in flight. A device slideshow's row reads "On this device" with
  "All 24 from Immich · plays offline" or "20 from Immich, 4 from this device · plays offline"
  (only when the server library is on).
- **Edits** go through the same editors; each is a `PUT` with the revision last seen. 412: the
  edit is not applied, the screen shows the returned current version and the toast "Changed on
  another device. Showing the latest version." 404: back to start with "This slideshow no longer
  exists." A network failure: the edit is not applied, the coral toast "Couldn't save. Your
  Glissando server isn't answering." and the screen keeps the last saved version.
- **Adding pictures**: Immich only, linked, as in the wizard's server mode (the lead leaves out
  downscaling); "Add" stores them with one edit at the revision last seen. Refused as an edit
  is, with its toasts: 412 adds nothing and the add screen takes the current version (its
  pictures become the known ones), keeping the selection for another "Add"; a network failure
  adds nothing and keeps the selection.
- **Missing pictures**: a picture Immich answers 404 for (thumbnail or original) shows as a dashed
  tile "No longer in Immich"; below the strip the lemon notice "n pictures are no longer in Immich.
  They are skipped when playing." with "Remove them". The player skips it.
- **⋯ menu**: "Keep a copy on this device" (subtitle "Downloads n pictures. Plays offline."),
  "Export" (subtitle "A .glissando file, pictures downloaded from Immich"), separator, "Delete
  slideshow …" (subtitle "For every device"; the confirmation says so).
- **Keep a copy**: a sheet "Keep a copy on this device?" — "Downloads n pictures from Immich and
  the music. The copy plays offline and appears under “On this device”." / "Later edits to either
  one stay in that one." — Cancel / "Download and keep". It runs like an import (originals
  through `decodePicture`, Immich's faces as focus, claims, all or nothing, title made unique;
  a picture no longer in Immich fails the copy — `keepCopyOnDevice`), the header progress
  "Copying “title” … 34 %"; done: toast "Copied to this device" with "Open".
- A device slideshow's ⋯ menu adds (server library on) "Save on the server" ("A copy for every
  device at home"). All pictures from Immich: the sheet "Save on the server?" — "Every device that
  opens this Glissando can then play and edit it. Its n pictures stay in Immich and are linked,
  not uploaded. The music (3.1 MB) is stored on the server." / "The slideshow on this device stays
  as it is. The two copies are independent." — Cancel / "Save on the server". Some from the
  device: "n pictures are only on this device", listing their file names, "Upload them to Immich
  and add them from there, or save the slideshow without them." — Cancel / "Save without these
  n"; with no picture from Immich at all, the same sheet with Cancel only. Done: toast "Saved on
  the server" with "Open". Not answering: the coral toast "Couldn't save on the server. Your
  Glissando server isn't answering." Refused, as the request the server refused names it: a 413
  for the music "Couldn't save on the server: the music is larger than 200 MB.", a 413 for the
  slideshow "… the slideshow is larger than 2 MB.", any other refusal "Your Glissando server
  refused the slideshow." — each a coral toast, the refusal logged.

## Playing and exporting

- `ServerSlideshowStore` (`src/server-library/`) implements the slices of `LibraryStore` the
  slideshow screen, editors, player and exports use: `pictureBlob(assetId)` fetches the original
  through `/immich/` and makes the display rendition on the device (Immich's preview where the
  original cannot be decoded, as on import); `thumbnailBlob` is Immich's thumbnail; `musicBlob`
  the server's music; `pictureFocus` the largest Immich face box (ADR-0013's rule), asked once per
  picture and kept for the session (faces Immich could not give are logged and asked again
  later); `putPictureFocus` keeps it for the session only; `musicBeats`/`putMusicBeats` read and
  keep the beats beside the server's music, listened for by the first device that opens the
  slideshow in the player or the music editor (`serverBeatPass`, ADR-0021). Both stores share the type
  `SlideshowStore` (`src/library/stored-slideshow.ts`).
- Errors the screens tell apart: an unknown slideshow is `SlideshowNotFoundError` as on the
  device; an edit at a stale revision `SlideshowChangedError` carrying the current slideshow; a
  server out of reach or failing (network, 5xx) `ServerLibraryUnavailableError`; a picture Immich
  answers 404 for `PictureMissingFromImmichError`; Immich itself unavailable
  `ImmichUnavailableError` (also reported to `ImmichAvailability`). Edits are applied one at a
  time, each naming the revision the one before left; one that failed leaves the last saved
  version as the one the next edit names.
- The player prepares pictures ahead as for device slideshows (ADR-0014). It plays without the
  pictures the screen already knows are missing; one that fails with a 404 while playing is added
  to them and the player restarts without it, where its slide would have begun (`PlayerLayer`,
  `server-playing.ts`). Any other failure stops playing with "Immich isn't answering"; its Close
  goes back to the slideshow.
- Video and web page export work the same way (the pictures are fetched as they are needed).
  The video sheet's estimate does not depend on the pictures and shows as for a device
  slideshow; the web page sheet measures no picture, as that would download them all, and its
  size line says "pictures downloaded from Immich" instead of a number.
