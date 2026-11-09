# Where a new slideshow lives

With the server library on, the pictures step shows above everything a group "Where should it
live?" with two options: "This device" ("Pictures are downloaded and stored here. Plays
offline.") and "Glissando server" ("Pictures stay in Immich. Plays on every device at home,
online."); the last choice is remembered per device, "This device" by default. Once a picture is
in, or while pictures are still being downloaded or linked, both are disabled with "Chosen for
this slideshow. Remove the pictures to change it." Not on:
no group, the step as before.

**Glissando server** chosen: the "From Immich" box comes first with "Open Immich" as the primary
button; the device drop zone is disabled with "A server slideshow only links photos from Immich.
Upload these to Immich first, or save this slideshow on this device." The "Open file" box is not
offered, and photos skipped as duplicates stay skipped (no "Add anyway"). Picked photos join at once
(no downscaling; tiles are Immich thumbnails) with the mint notice "Linked from Immich. Nothing is
downloaded now; playing loads the pictures from Immich." Duplicates are skipped as before
(ADR-0016). Picks are linked one after another, so a photo picked twice in quick succession is
linked once; "Create slideshow" and "Add" wait for a link still running, and discarding drops
it. The music step is unchanged; "Create slideshow" uploads each song's music, then creates the
document, under the overlay "Saving on your Glissando server …". A failure keeps the
wizard as it was with a coral toast naming it and "Try again".
