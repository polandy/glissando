# Measuring the loudness

`LoudnessPass` (`library/loudness-pass.ts`) measures, in the background, the loudness of every
song of every stored slideshow without a result (ADR-0040), the pattern of the beat pass
(`library/beat-pass.ts`, `dev-docs/library/BEAT_LISTENING.md`): one track at a time, a track two
slideshows share once, its file through the `LoudnessMeter` into the store — the blocks found or
a logged failure. The meter (`loudness/worker-loudness-meter.ts`) decodes on the main thread
(`loudness/decode-music-full-rate.ts`: `OfflineAudioContext` at the device's own output rate,
every channel kept) and hands the channels over to a worker (`loudness/loudness-worker.ts`) that
runs `measureLoudness` (ITU-R BS.1770: K-weighted, 400 ms gating blocks at a 100 ms hop, plus each
hop's sample peak). The pass starts when the app opens and whenever a slideshow is created (an
import, an opened file); music deleted meanwhile is skipped; a failed measurement is logged
(`LoudnessMeasurementFailedError`), keeps no result and is tried again on the next pass; music the
device cannot decode (`MusicUnmeasurableError`) is marked `undecodable` until it is found after
all; a crashed meter (`LoudnessMeterGoneError`) ends the pass and is reported once; later passes
meeting it only log it. Its state: `running`; `listening`, the tracks still to come; `found`,
every result stored since the app opened; and `undecodable`.

A second `LoudnessPass` over the server store (`serverLoudnessPass`) does the same for server
slideshows, asked only by `listenFor`: the first device to open one in the player or the music
editor measures it and keeps the result on the server beside the music
(`dev-docs/SERVER_LIBRARY.md`), where every other device reads it. It shares the device's meter;
a server out of reach is only logged.

`src/app/loudness/track-loudness.ts` and `playlist-loudness.ts` let the music editor read a
song's stored loudness and follow the pass as it measures one (`TrackLoudness`,
`PlaylistLoudness`), the pattern of `src/app/beats/track-beats.ts` and `playlist-beats.ts`; no
screen shows this yet.
