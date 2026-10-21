# Looking for the focus

`FocusPass` (`library/focus-pass.ts`, with `focus-pass-queue.ts` for its queue and
`focus-pass-types.ts` for its ports and state shape) looks, in the background, for the focus of
every stored picture whose record is missing or outdated: newest slideshow first, one picture at
a time, its thumbnail through the `FocusDetector` (a worker) into the store: a face (pico,
ADR-0012, `foundBy: "face"`), and only when there is none the main object (YOLOX-nano, any of its
80 classes, ADR-0036, `foundBy: "object"`), stored the same way as a `{kind: "subject"}` box; with
neither, a wide picture that is mostly green or blue, or has a calm sky over a busier ground, is
`{kind: "scenery"}` (ADR-0037) and gets a sideways sweep. Every stored focus carries `detector`,
the `FOCUS_DETECTOR_VERSION` that found it (1 faces, ADR-0012; 2 objects, ADR-0036; 3 scenery,
ADR-0037); a record from an older version is outdated and is looked at again, the old result used
until the new one is stored (ADR-0041). It starts when the app opens and again whenever a
slideshow is created (an import, an opened file); a start while it runs only takes up the
slideshows created since, so two never run at once. `lookAgain(pictureIds)` asks for specific
pictures regardless of their record — a slideshow-wide look-again is the caller passing all its
picture ids — ahead of the background scan; a picture already queued moves to the front instead
of being queued twice, and `lookAgain` starts the pass on its own if it is not already running.

A picture from Immich with faces already has its focus when it is stored: the box around the
largest of Immich's faces (by area; Immich gives no score) and those of similar size (ADR-0029),
divided by its `imageWidth`/`imageHeight` (Immich's preview in display orientation), stored as
`{kind: "subject", foundBy: "immich-faces"}` with the current `FOCUS_DETECTOR_VERSION`. An empty
face list stores nothing — it may mean "not scanned yet" — so the pass looks at that picture like
any other.

A picture whose media is gone meanwhile is skipped; one whose detection fails is logged
(`FocusDetectionFailedError`), keeps no focus and is tried again on the next pass — its id is
added to `failed` for this app session and removed once a later look at it succeeds. A detection
failing because the detector itself is gone (`FocusDetectorGoneError`: its worker crashed, sent a
reply that could not be read, or answered `unavailable` as its face cascade did not load) ends the
pass and is reported once; the pictures left wait for the next pass. An error from reading a
thumbnail or storing a result that the injected `pausesOn` predicate accepts — "try again later",
such as a server being unreachable, rather than "this picture's detection failed" — ends the pass
quietly (logged, not reported) and sets `paused`; the next `start()` or `lookAgain()` resumes
where it left off and clears `paused`. Any other unexpected store error ends the pass and is
reported too.

The pass writes only the focus record it found: its store port (`FocusPassPorts["store"]`) can
only list slideshows, read a thumbnail and read or write a picture's focus, so it can never touch
a picture's own motion (Ken Burns) or any other field of a slideshow record (ADR-0041). A store
may add `detectionInput(pictureId)` in place of the thumbnail: answering a focus directly skips the
detector; answering a `Blob` is detected the same as a thumbnail would be. A second `FocusPass`
runs this way over the Glissando server's own slideshows, sharing one detector with the device pass
through `serializeFocusDetector` so the two never detect at once
(`dev-docs/server_library/FOCUS.md`).

Its state, with the Svelte store contract: `running`; `paused`, set by a `pausesOn` pause; per
slideshow with pictures left, `done` of `total` (those it had no current focus for when taken up),
`again` (true once every one of them already had a record — outdated, or asked again through
`lookAgain`) and `failed` (this slideshow's pictures still in `FocusPassState.failed`); `searching`,
the pictures still to come; `found`, every focus it stored since the app opened; and `failed`, the
pictures whose detection failed this session. A slideshow's `failed` count outlives the pass taking
it up — once every one of its pictures is taken up, it keeps reporting its failures with `done` and
`total` both 0, for the start card and the Focus sheet to still show them — and is only cleared
picture by picture, as each failure is looked at again and succeeds. The slideshow screen merges
`found` into the focus it read on opening, so the editors' automatic motions and focus marks follow
at once.
