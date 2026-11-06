# Analysing the music

`MusicAnalysisPass` (`library/music-analysis-pass.ts`) analyses, in the background, every song of
every stored slideshow that lacks its beats or its loudness (ADR-0021, ADR-0040, ADR-0051), the
pattern of the focus pass: one track at a time, a track two slideshows share once, its file
through the `MusicAnalyser` into the store — both results at once: the beats found or
`{kind: "none"}` for music without a clear beat, and the loudness blocks. The analyser
(`music-analysis/worker-music-analyser.ts`) decodes once on the main thread
(`music-analysis/decode-music-full-rate.ts`: `OfflineAudioContext` at the device's own output
rate, every channel kept) and hands the channels over to one worker
(`music-analysis/analysis-worker.ts`). The worker runs `measureLoudness` on them (ITU-R BS.1770:
K-weighted, 400 ms gating blocks at a 100 ms hop, plus each hop's sample peak), then mixes them to
mono and resamples to 11 025 Hz with its own Kaiser-windowed sinc low-pass
(`mix-to-detection-rate.ts`) and runs `detectBeats`. The pass starts when the app opens and
whenever a slideshow is created (an import, an opened file); opening the music editor or the
player asks it for that one track (`listenFor`), which goes ahead of the queue unless both results
are stored. Music deleted meanwhile is skipped; a failed analysis is logged
(`MusicAnalysisFailedError`), keeps no result and is tried again on the next pass; music the device
cannot decode (`MusicUndecodableError`) is marked `undecodable` until it is analysed after all; a
crashed worker (`MusicAnalyserGoneError`) ends the pass and is reported once; later passes meeting
it only log it. Its state: `running`; `listening`, the tracks still to come; `found`, every
analysis stored since the app opened; and `undecodable`.

A second `MusicAnalysisPass` over the server store (`serverAnalysisPass`) does the same for server
slideshows, asked only by `listenFor`: the first device to open one in the player or the music
editor analyses it and keeps both results on the server beside the music
(`dev-docs/SERVER_LIBRARY.md`), where every other device reads them. It shares the device's
analyser; a server out of reach is only logged. The player and both exports read the stored beats
of every song once when they start (`storedSongBeats`); the picture and music editors follow the
pass as it finds the first song's (`TrackBeats`) and read a song's loudness the same way
(`src/app/loudness/track-loudness.ts`, `playlist-loudness.ts`); the music editor draws the
selected song's waveform from that loudness's hop peaks and asks the pass for the song when it is
selected (ADR-0051). `.glissando` files carry neither:
the receiver analyses again.

A write commits its transaction explicitly (`commit()`) as soon as its last request is placed —
right away for a plain write, in the read's callback for one that reads first. Chromium aborts a
transaction still open when the page unloads, so an edit followed at once by a reload would
otherwise be lost. Every edit starts its write synchronously in the event that made it.

A removal claims the removed picture's media in `imports` (below) before the record without it
is stored, and releases the claim once its undo toast is gone: undone (after the restoring save
is queued), expired, replaced by another toast, ended by a move, or the screen left. So a
clean-up in any tab spares that media while Undo can still bring the picture back; afterwards it
counts as unreferenced.
