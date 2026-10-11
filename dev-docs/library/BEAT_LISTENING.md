# Listening for the beats

`BeatPass` (`library/beat-pass.ts`) listens, in the background, for the beats of every song
of every stored slideshow without a result (ADR-0021), the pattern of the focus pass: one track at a time, a track
two slideshows share once, its file through the `BeatDetector` into the store — the beats found
or `{kind: "none"}` for music without a clear beat. The detector (`beats/worker-beat-detector.ts`)
decodes on the main thread (`decodeMusicWithWebAudio`: `OfflineAudioContext` at 11 025 Hz, the
channels mixed to mono) and hands the samples over to a worker (`beats/beat-worker.ts`) that runs
`detectBeats`. The pass starts when the app opens and whenever a slideshow is created (an import,
an opened file); opening the music editor or the player asks it for that one track
(`listenFor`), which goes ahead of the queue unless a result is stored. Music deleted meanwhile is
skipped; a failed detection is logged (`BeatDetectionFailedError`), keeps no result and is tried
again on the next pass; music the device cannot decode (`MusicUndecodableError`) is marked
`undecodable` until it is found after all; a crashed worker (`BeatDetectorGoneError`) ends the
pass and is reported once; later passes meeting it only log it. Its state: `running`; `listening`, the tracks still to come; `found`,
every result stored since the app opened; and `undecodable`.

A second `BeatPass` over the server store (`serverBeatPass`) does the same for server
slideshows, asked only by `listenFor`: the first device to open one in the player or the music
editor listens and keeps the result on the server beside the music
(`dev-docs/SERVER_LIBRARY.md`), where every other device reads it. It shares the device's
detector; a server out of reach is only logged. The player and both exports read the stored
beats of every song once when they start (`storedSongBeats`); the picture and music editors
follow the pass as it finds the first song's (`TrackBeats`). `.glissando` files carry no beats: the receiver listens again.

A write commits its transaction explicitly (`commit()`) as soon as its last request is placed —
right away for a plain write, in the read's callback for one that reads first. Chromium aborts a
transaction still open when the page unloads, so an edit followed at once by a reload would
otherwise be lost. Every edit starts its write synchronously in the event that made it.

A removal claims the removed picture's media in `imports` (below) before the record without it
is stored, and releases the claim once its undo toast is gone: undone (after the restoring save
is queued), expired, replaced by another toast, ended by a move, or the screen left. So a
clean-up in any tab spares that media while Undo can still bring the picture back; afterwards it
counts as unreferenced.
