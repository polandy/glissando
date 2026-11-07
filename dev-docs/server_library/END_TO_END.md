# End to end

E2E-034 runs the agreed flow in each engine: a slideshow created on the server from Immich photos
(no original downloaded), its card under "On your Glissando server", an edit saved at the next
revision, "Keep a copy on this device" showing "Copying “title” … n %" in the header while an
Immich original is held, then putting a copy under "On this device", and a photo deleted
in Immich shown as missing. The library service and Immich are answered in the page, in memory
(`e2e/support/fake-glissando-server.ts`), so every step waits on what the screen shows.

E2E-118 holds the Immich thumbnails the link reads for its colours
(`e2e/support/hold-immich-images.ts`). While the link is pending and no picture is in the
slideshow yet, both options of "Where should it live?" are disabled and the lock note shows; once
released, the photos are linked.
