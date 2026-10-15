# Looking for the focus

`FocusPass` (`library/focus-pass.ts`) looks, in the background, for the focus of every stored
picture without one (ADR-0012): newest slideshow first, one picture at a time, its thumbnail
through the `FocusDetector` (a worker) into the store: a face (pico, ADR-0012), and only when there is none the main object (YOLOX-nano, any of its 80 classes, ADR-0036), stored the same way as a `{kind: "subject"}` box; with neither, a wide picture with a calm blue or bright sky over a busier ground is `{kind: "scenery"}` (ADR-0037) and gets a sideways sweep. It starts when the app opens and again
whenever a slideshow is created (an import, an opened file); a start while it runs only takes up
the slideshows created since, so two never run at once. A picture from Immich with faces already
has its focus when it is stored: the box around the largest of Immich's faces (by area; Immich gives no
score) and those of similar size (ADR-0029), divided by its `imageWidth`/`imageHeight` (Immich's preview in display orientation),
stored as `{kind: "subject"}`. An empty face list stores nothing — it may mean "not scanned yet" —
so the pass looks at that picture like any other. A picture whose media is gone meanwhile
is skipped; one whose detection fails is logged (`FocusDetectionFailedError`), keeps no focus and
is tried again on the next pass. A detection failing because the detector itself is gone
(`FocusDetectorGoneError`: its worker crashed, sent a reply that could not be read, or answered
`unavailable` as its face cascade did not load) ends the pass and is reported once; the pictures
left wait for the next pass. An unexpected store error ends the pass and is reported too. Its
state, with the Svelte store contract: `running`; per slideshow with pictures left, `done` of
`total` (those it had no focus for when taken up); `searching`, the pictures still to come; and
`found`, every focus it stored since the app opened. The slideshow screen merges `found` into
the focus it read on opening, so the editors' automatic motions and focus marks follow at once.
