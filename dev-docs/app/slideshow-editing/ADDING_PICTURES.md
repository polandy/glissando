# Adding pictures

- **Adding pictures** (`add-pictures/`, route `{ screen: "add", slideshowId }`; mockup:
  https://polandy.github.io/glissando-assets/mockups/add-pictures/): the strip header's "Add
  pictures" opens the import's pictures step for this slideshow, under the crumbs "title / Add
  pictures", without the step bar, the music step and the "Slideshow from another device?"
  box. Its lead: "They go into place by capture date." (with own order: "Your own order stays;
  choose below where the new pictures go."), then "Glissando downscales them for this device;
  your originals stay untouched." The drop zone, the Immich box (its browser opens for this
  slideshow, Immich below), the queue and the tiles (selecting, View, F, removing — [IMPORT_ARRANGING.md](../IMPORT_ARRANGING.md), In "Add media"), the set-aside
  pictures (Culling, Import wizard; similar shots are found among the new pictures only) and the
  notices are the import's; pictures already in the slideshow are skipped (Duplicates, Import
  wizard), and "Add n" waits for the check as "Next" does. Once at least one new
  picture is stored and nothing is in flight, with own order a box "Where they go" (mockup:
  https://polandy.github.io/glissando-assets/mockups/sort-added-by-date/) offers a radio group
  "By capture date" ("Each goes right after the picture taken just before it.", chosen at
  first) and "At the end" ("After picture 24, in capture order."); the choice lives in the
  session, so it stays while the selection does, and every new selection starts by capture
  date. Below it, a box "After adding" shows pictures "24 → 32",
  duration "5:40 → 5:40" and, when automatic pictures share the music, per picture "14.2 s →
  10.6 s" — the composition rules (`src/compose/`, ADR-0008) on the slideshow with the new
  pictures, so own durations stay. With music the pictures fill, a line "The pictures keep sharing the music;
  each gets a little shorter. Pictures with their own duration stay about that long.", or, when the
  automatic pictures' share would fall below the 2 s floor, a lemon notice "The music is too short for all pictures: no
  picture shows for less than 2 s, so the slideshow runs 7:28 and the music 5:40."; without
  music, or with music whose pictures last their own seconds (ADR-0022), "Each new picture gets
  5 s; the slideshow gets longer." (the slideshow's seconds per picture). With own order the box ends with the play order after adding as small numbered
  thumbnails, the new ones outlined, and their spots, e.g. "2 after picture 1 · 1 after
  picture 6" ("before picture 1" at the very start); both follow the choice. The bottom actions: "Cancel" and "Add n". Cancel and ← with new pictures ask
  "Discard selection?" as in the import; discarding goes back to the slideshow unchanged and
  the clean-up deletes their media. While "Add n" stores, Cancel and ← are disabled and a
  discard is ignored. "Add n" stores the record once (`addPictures` in
  `slideshow-edits.ts`, through `updateSlideshowWith`): sorted by capture date the new pictures
  take their places and the slideshow stays sorted; with own order `ownOrder` stays and they go
  as chosen: by capture date each right after the picture taken last no later than it (the
  later one in play order on a tie), one older than all right before the oldest, several at one
  spot in capture order (`placeByCaptureDate`, `src/library/added-placement.ts`); or at the end
  in capture order. The screen then returns to the slideshow, where the new
  tiles carry an accent outline and a "new" badge while it is shown (label adds "new"), and
  the toast "8 pictures added" with "Undo" takes out those of them still in the slideshow
  (the next clean-up deletes their media). The focus pass starts for the new pictures, as
  after an import. A slideshow deleted meanwhile ends it like an edit would: back to start
  with "This slideshow no longer exists.", the new media discarded. The selection lives in
  memory for the tab like the import's (history restores the screen only from the screen
  itself or its Immich browser); opening "Add media" again on the same slideshow keeps it
  and takes the slideshow as stored now (its title, order and pictures, the known ones for
  Duplicates), on another slideshow discards it.
