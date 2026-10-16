# Import wizard

`import/ImportRoute.svelte` shows two steps under the crumbs "Library / New slideshow /
Pictures | Music" and a numbered two-step bar (a done step shows a mint check); the actions sit at the bottom. One `ImportSession`
(`import/import-session.ts`) holds the selection for the tab: leaving by the browser back
gesture (which cannot be stopped) keeps it, and "New slideshow" resumes it. With the server
library on, the pictures step starts with "Where should it live?"; a server slideshow links its
Immich photos, offers no "Open file" and is created on the server
(server_library/IN_THE_APP.md).

- **Videos** are chosen with the pictures (`video/*`, mp4, webm, mov). A video tile carries a play glyph and
  its length; "Ausschnitt" marks a clip cut to its first 5 minutes. A video the browser cannot play, or over 1 GiB, is
  refused with a red notice naming it; the rest goes on. A clip over 5 minutes gets an amber notice (the excerpt is picked in the clip editor).
- **Pictures**: a drop zone with "Choose pictures" (several files, `image/*`), "choose a
  folder", and drag-and-drop on desktop (folders read recursively). While downscaling: "k of N
  pictures are being downscaled …" with a mono counter, Cancel and a mint meter; a shimmering
  placeholder per file still in flight; the tiles appear in capture order as
  they are stored. Then "n pictures · from – to" and "add more". A tile opens its picture full
  screen ([PICTURE_VIEWER.md](PICTURE_VIEWER.md)). **Removing** (mockup:
  https://polandy.github.io/glissando-assets/mockups/remove-import-pictures/): a stored tile has
  a ✕ ("Remove picture from <date>"), always shown on touch, on hover or keyboard focus for a
  mouse; a click, a tap, or Enter, Space, Delete or Backspace on it removes the picture at once,
  never confirmed, and focus moves to the next tile's ✕ (the previous one at the end, "Choose
  pictures" when none is left). The toast "Picture removed" with "Undo" follows; removals while
  it shows add up ("3 pictures removed") and one Undo puts them all back. Choosing more pictures,
  discarding, or leaving the step (Next, Cancel, ←) ends the undo and dismisses the toast. A
  removed picture leaves the count and no longer counts as a duplicate; its media is cleaned up
  with the import's (`PictureIntake`, `picture-removals.ts`). Skipped files are a lemon
  notice "n files could not be read as pictures and were skipped: names. The other m pictures
  are in." (photos that could not be downloaded from Immich get their own sentence "n photos
  could not be downloaded from Immich and were skipped: names." and a picture the browser read
  but cannot decode "n pictures could not be decoded and were skipped: names.", in the same
  notice; each read and each decode is tried twice before a picture is skipped, and the skip is
  logged with its cause), full storage a coral one with "Choose fewer pictures" (discards and reopens the
  picker). A failed import is a coral notice "The import failed. No more pictures can be added."
  with "Start over" (discards the selection and shows the empty drop zone); the drop zone and
  "add more" stay hidden until then. Its error is logged; the notice is its only message (no
  "unexpected error" toast besides). "Next" is enabled once nothing is in flight, every picture is checked (Culling) and at least one picture is stored.
  Cancel and ← with a selection ask "Discard selection?" (Keep choosing / Discard). While the
  drop zone shows, a box below it offers "Slideshow from another device?" with "Open file"; a
  single .glissando file chosen or dropped on the drop zone opens it ([SCREENS.md](SCREENS.md)) instead of being
  imported as a picture. **Duplicates** (ADR-0016): a picture already in the slideshow being
  added to, or already taken in by this import, is skipped before it is downscaled and counts
  as done; a lemon notice per kind names them, "2 pictures are already in the slideshow and were
  skipped: names." and "2 pictures were chosen twice and were skipped: names.", each with "Add
  anyway", which takes that kind in after all. **Culling** (ADR-0024, mockup:
  https://polandy.github.io/glissando-assets/mockups/culling/): each picture stored is checked
  in a worker on its 480 px thumbnail (`src/culling/`, `import/picture-culling.ts`); once the
  downscale is done the progress reads "k / N checked for similar shots and blur …" with Cancel and the
  mint meter, and "Next" waits for it. Once every picture is checked and nothing is in flight,
  all but the sharpest of each similar group (shots of the same scene within 2 minutes of the
  group's first) and the blurry ones leave the strip for a section "Set aside
  · n" below it, with "Take all in" and "These are not in the slideshow. Take one in with +.": a
  group per similar group ("Similar · <date> <start>–<end> · the sharpest is kept", hours and
  minutes, one time when both fall in the same minute; the kept picture first with a
  mint "Kept" chip, the others "Similar"), then "Blurry"; set-aside tiles are dimmed and show
  their time to the second. A tile's + ("Take in picture from <date> at <time>", a 44 px target)
  puts it back into the strip at its capture-date place and focus moves to the next +; from then
  on it is an ordinary picture (✕ removes it) and never set aside again; "Take all in" takes all
  back. Once none is left set aside, focus moves to the ✕ in the strip of the picture taken in
  last (for "Take all in", the latest of them). Set-aside pictures are not kept: the slideshow never references them, so the clean-up
  after Next deletes their media. Exact duplicates are skipped before the check, and duplicates
  taken in by "Add anyway" are never set aside. A picture the check cannot measure stays in;
  once the check worker is gone (crashed, or a reply it cannot read) every picture from then on
  stays in unchecked, the error logged once, and "Next" is not held. Linked photos of a server
  slideshow are not downloaded, so they are not checked. Above that box, when this Glissando offers Immich ([IMMICH.md](IMMICH.md)), a box "From
  Immich" with "Open Immich" opens the Immich browser; offline it is greyed out ("Offline — Immich
  needs a connection to your Glissando server …"), with an Immich problem it names it and offers
  "Settings". Photos added from Immich join the same import: the same progress ("n / m pictures
  being downsized …"), tiles, notices and "Next"; "add more" then also offers "more from Immich".
  A photo whose original or preview Immich does not deliver (e.g. a 404 for one deleted in Immich
  after browsing) is skipped as not downloaded and the import goes on; when only its faces fail,
  it is kept without a focus (the on-device pass looks for one) and the error is logged. An Immich
  problem met on the way (e.g. a rejected key) is reported to `ImmichAvailability`, so the Immich
  box and the settings name it.
- **Music** (optional): the intro "One song or several — they play one after another and the
  pictures change on their beat. Without music each picture stays 5 s.", then a drop zone with
  "Choose music" (`audio/*`, several at once; hint "One or more files · MP3, M4A, FLAC, WAV, Ogg,
  AIFF, WMA …"). Picked or dropped files join `ImportChoices.songs`, a keyed list, after the
  songs already in it, and are read one at a time in the order picked by
  `import/music-pick.ts` (`readPickedMusic`, the music editor's too): the format is recognised
  from the file's first bytes (`src/import/music-format.ts`); MP3, AAC, FLAC, Opus and PCM WAV are
  kept as they are; ALAC, AIFF, CAF, AC-3/E-AC-3, WMA, AMR and Ogg Vorbis, which a target browser
  cannot decode, are converted on the device to a FLAC copy, and only the copy is stored
  (ADR-0020). Once a song is in, the drop zone gives way to the song list, the music editor's
  (`SongList.svelte`, without selecting): per song a grip, its number in its colour, the picked
  name, "1:00 · WAV" (a converted one adds "Converted from Apple Lossless on this device"), "from
  0:57" where it starts in the slideshow or, dimmed, "Not reached", and × removing it (cancelling
  its conversion). The grip drags the song onto another row or moves it with the arrow keys while
  focused (ADR-0019's pattern). A song being read is a dashed row with its name ("Converting to
  FLAC · 42 %" while converting); a file that cannot be read or converted, or is copy-protected
  (an iTunes `drms` track), is a coral row "This file can't be used" until its ×. A dashed "+ Add
  another song" follows the list. The songs are placed as the slideshow will play them, each
  crossfading into the next (ADR-0023). With a song chosen, a panel holds the **Picture length**
  choice — "About 5 s each" (the default) with its stepper, or "Fill the music" — and a strip of
  the pictures' thumbnails over the songs as numbered blocks in their colours, both to one scale,
  a song not reached dimmed; under it "24 pictures · 2:00" and "Music 2:54", and "The music fades
  out with the last picture." (with a song not reached "…; the dimmed songs are not reached.") /
  "The last pictures play in silence." / "The slideshow ends with the music." No waveform, as
  only the duration is probed. Without a chosen song a card "Time per picture" with the seconds
  per picture (default 5 s). The row "n pictures | x s per picture | m:ss total" follows the
  composition rules (`src/compose/`). "Pictures" goes back; while a song is read the primary
  button is disabled as "Converting …"; otherwise "Create slideshow" (or "Create without music")
  stores every chosen song in the list's order and then the slideshow record under the blocking
  overlay "Creating slideshow …", opens the slideshow and shows the toast "Slideshow created —
  tap Play".
