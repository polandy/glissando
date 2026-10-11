# End to end

E2E-034 runs the agreed flow in each engine: a slideshow created on the server from Immich photos
(no original downloaded), its card under "On your Glissando server", an edit saved at the next
revision, "Keep a copy on this device" putting a copy under "On this device", and a photo deleted
in Immich shown as missing. The library service and Immich are answered in the page, in memory
(`e2e/support/fake-glissando-server.ts`), so every step waits on what the screen shows.
