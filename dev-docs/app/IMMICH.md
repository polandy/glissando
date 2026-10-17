# Immich

Only the self-hosted Glissando offers Immich (ADR-0013, `docs/self-hosting.md`); the key lives in
its container, the app has no key field. `immich/immich-availability.ts` asks
`./immich/api/server/version` when the app opens, when the pictures step opens and on "Check
again", and publishes an `ImmichStatus` (`src/immich/immich-client.ts`): available, not set up
(the Immich box stays hidden), offline, Immich unreachable from the server, key rejected,
permission missing, sign-in expired (the owner's proxy redirected). If the version answer does
not match Immich's API, the error is reported and the status stays "checking". A problem a request
meets while browsing or importing is published at once (`report(kind)`); the next check may clear
it.

`immich/ImmichRoute.svelte`, under the crumbs "New slideshow / Pictures / Immich" (adding
pictures: "title / Add media / Immich"; an album adds its name), opened from the pictures step
(route `{ screen: "immich", albumId, slideshowId }`, `slideshowId` null for a new slideshow); ← goes back a level (album → albums → pictures step),
keeping the selection. `immich/immich-browser.ts` holds the selection, the tab, the albums and the
feeds read so far for as long as the intake it feeds lives (`immich-browsers.ts` keeps one per
intake, the import's or the adding's):

- **Tabs** "All photos" (first) and "Albums".
- **All photos**: the library's photos newest first, grouped by day (heading "Sat, 12 July 2025",
  mono count, "Select day" / "Deselect day"), square tiles from Immich's thumbnails loaded lazily.
  The next 60 load when the list nears its end (shimmering tiles meanwhile); after the last page
  "That's all · n photos". Videos are listed with a play glyph and their length in the corner of
  the tile when the slideshow lives on the device; a server slideshow links photos only and does
  not list them. A picked video is downloaded whole — Immich's playable version (its transcoded
  copy, else the original), never streamed — and becomes a video slide (dev-docs/player/VIDEO_SLIDES.md);
  its tile shows the wait, and a failed download names the video at its tile like a photo's.
- **Albums**: a grid of covers with name and "n photos · date range" (mono), a filter field
  (by name; "No album matches"), shimmering cards while loading. The circle on a cover selects the
  whole album (all its photos, fetched page by page), a badge counts what is selected in it. An
  album opens to its photos by day, with "Select all n" / "Select none"; "n videos hidden" when it
  has any that are not listed (a server slideshow); an empty album says so. Immich counts an
  album's videos with its photos, so the count of photos, "Select all n" and "n videos hidden" are exact once all of its pages are read (the
  first page of a small album; until then "n photos" is Immich's count and the button "Select
  all"), and the badge counts only photos already read from that album.
- **Already in**: a photo already in the slideshow being added to, or already taken in by the
  import, shows dimmed with a check chip "Already in", cannot be selected and is passed over by
  "Select day", "Select all" and a whole album; the album view says "n already in".
- **Selection** spans both tabs and several albums. A tile toggles with a tap (check circle, the
  photo inset on a peach tint). A shift-click gives every photo shown from the last tapped one to
  this one the last tapped one's state (selected or not), across days; the next shift-click
  re-aims from the same photo. The footer reads "n selected (from k albums, when k ≥ 2)" or "Tap photos or
  pick a whole album", with "Clear selection" and "Add n", which returns to the pictures step and
  adds them to the import (a server slideshow's are linked, not downloaded).
- A failing request names its problem with "Try again" ("Reload" for an expired sign-in, which
  only a reload brings back); the selection stays. Immich unreachable
  (or an unexpected error) reads "Immich isn't answering"; a problem the user can act on reads
  "Immich can't be used right now" with its one line from the settings (e.g. "Immich rejects the
  server's key."). A failed whole-album select fails that album only: its card, or the album
  view under "Select all", shows the line, and the next toggle tries again. A toggle while the
  album's photos are being fetched is ignored, and a photo deselected meanwhile stays deselected.
  The album route shows "Loading the album …" while the albums load, and their failure with "Try
  again"; an album no longer in Immich reads "This album is no longer in Immich" with "Back to
  albums".

**Settings** shows a read-only "Immich" group: "Through this Glissando server · Immich 3.3.1 ·
n albums" (the server's version) when available; "Not set up" with "How to set it up" (the self-hosting guide) when not;
otherwise the problem in one line ("The Glissando backend cannot reach the Immich server.", "Immich
rejects the server's key.", "The server's key lacks permissions." naming the five, "Your sign-in
has expired.") with "Check again" (or "Reload" for the sign-in). The cause in detail is in the
container's log, never in the app.
