# Files from this device for a server slideshow

A server slideshow only links pictures from Immich, so files from this device go into a copy of
it on this device; the server slideshow stays as it is (ADR-0055).

- **Entry**: on a server slideshow's add screen, below the Immich box, a drop zone "Pictures from
  this device" — "Adding these makes a copy on this device." with "Choose files". The wizard's
  server mode keeps its disabled box ([NEW_SLIDESHOW_HOME.md](NEW_SLIDESHOW_HOME.md)).
- **Sheet**: choosing or dropping files downloads nothing yet. "Make a copy on this device?" —
  "Pictures from this device can't be linked on the server. Glissando downloads the n pictures
  from Immich and the music, adds your m files, and opens the copy under “On this device”." /
  "The slideshow on the server stays as it is." — Cancel (drops the files) / "Download and add".
- **Copy**: confirming leaves the add screen and runs Keep a copy
  ([IN_THE_APP.md](IN_THE_APP.md), "A server slideshow's screen"), with its header progress,
  joining a copy of that slideshow already running. Once done, the copy's add screen opens with
  the files taken in as on any device slideshow (downscaled, duplicates skipped); its "Add" ends
  there (`ServerCopyFlows.keepCopyAndAdd`, `AddPicturesFlow.open` with files).
- **All or nothing**: a copy that fails (a picture no longer in Immich, Immich or the Glissando
  server not answering) creates nothing, drops the files and shows Keep a copy's coral toast,
  without "Try again". The server slideshow never changes.
