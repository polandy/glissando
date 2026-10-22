# ADR-0021: Automatic picture changes land on beats found on the device by an own detector

**Status:** accepted

## Context

Roadmap 6 (`dev-docs/SCOPE.md`; mockup:
https://polandy.github.io/glissando-assets/mockups/beat-sync/): the automatic picture changes
should land on the music's beats. Until now the pictures without an own duration share the
music's excerpt evenly (ADR-0008, ADR-0009), so a change falls wherever the division puts it.
A transition runs in the last part of its slide (ADR-0002), so a slide boundary is where the
transition ends. The beats have to be found offline, in the browser, on a phone, for any music
the user adds — including music without a clear beat.

## Measurement

Generated test music only (synthesised drums, clicks and tones with known beat times, encoded to
160 kbit/s MP3): a 120 BPM click track, 96 BPM drums with bass tones, a syncopated 140 BPM
pattern with off-beat accents, a 72 BPM drumless ballad, 110 BPM drums under pink noise, a 90 BPM
waltz, drums accelerating from 100 to 112 BPM, 124 BPM drums with a 10 s drumless break, and a
beatless ambient pad. Scores are the F-measure of the beats found against the true ones (±70 ms);
times are Chromium on a desktop, then with 6× CPU throttling as a stand-in for a phone.

| Track             | Own detector    | web-audio-beat-detector | music-tempo     | realtime-bpm-analyzer |
| ----------------- | --------------- | ----------------------- | --------------- | --------------------- |
| click 120         | 120, F 0.99     | error: no beats         | 120, F 1.00     | none                  |
| drums 96          | 96, F 0.99      | 96, F 0.99              | 192, F 0.67     | 96                    |
| syncopated 140    | 140, F 0.99     | 140, F 0.99             | 140, F 1.00     | 93                    |
| ballad 72         | 72, F 1.00      | 144, F 0.66             | 72, F 1.00      | 144                   |
| noisy drums 110   | 110, F 0.99     | 110, F 0.99             | 110, F 0.99     | 110                   |
| waltz 90          | 90, F 0.99      | 120, F 0.29             | 90, F 1.00      | 120                   |
| 100 → 112 BPM     | 107, F 0.99     | 110, F 0.46             | 107, F 1.00     | 103                   |
| break 124         | 124, F 0.99     | 124, F 0.99             | error: no beats | 124                   |
| ambient, no beat  | "no clear beat" | 114                     | 180             | 114                   |
| 3 min, desktop/6× | 0.28 s / 1.6 s  | 0.10 s (worker)         | 0.9 s / 6.0 s   | 0.08 s / 0.17 s       |

The own detector's beats sit within ±6 ms of the true ones once its constant 10 ms lead is taken
off; its pulse clarity is 4.3 to 38 on the tracks with a beat and 1.1 on the ambient pad.
Decoding at 11 025 Hz takes about 0.14 s for 3 minutes and is native code.

## Decision

- **An own detector**, about 200 lines in `src/beats/`, no dependency: the decoded track (mono,
  11 025 Hz, decoded by `OfflineAudioContext` on the main thread) goes to a **Web Worker** that
  builds a spectral-flux onset curve (512-sample frames, 128-sample hop), finds the tempo by
  autocorrelation between 50 and 200 BPM (harmonics weighted in, a log-normal preference around
  120 BPM), and tracks the individual beats by dynamic programming (Ellis 2007), so a song that
  speeds up or slows down is followed. The result is the **list of beat times** plus the tempo
  and the pulse clarity.
- **No clear beat** below a pulse clarity of 2: the music is stored as having none, and the
  pictures share it evenly as before.
- **Where**: a `beats` IndexedDB store keyed by music id, beside the media and deleted with it, run
  by a background pass for music without a result — the pattern of the focus (ADR-0012).
  `.glissando` files do not carry it; the receiver detects again.
- **The choice** is the music's: `StoredMusic.pictureChanges` absent means automatic (on the beat
  when a beat was found), `"even"` keeps the even share. It travels with the track like the trim
  (ADR-0009); `.glissando` goes to version 8.
- **Composing**: the even shares are computed as before; then each boundary moves to the nearest
  beat inside the excerpt, the difference taken up by the next automatic slide ahead, never
  leaving a slide below `MIN_SECONDS_PER_PICTURE`. The last boundary stays at the excerpt's end,
  so the slideshow still ends with the music, unless no automatic slide is left after a boundary
  to take up the difference: that one then moves too. A transition into a slide on the beat lasts
  the largest whole number of beats that fits its usual duration (30 % of the slide, at most 1 s),
  so it starts on a beat too; one beat longer than that keeps the usual duration.
- **Own durations move to about their set length** (ADR-0008): a boundary after a picture with an
  own duration moves the same way, but only within half its slack above `MIN_SECONDS_PER_PICTURE`
  either way of its set length, so it keeps about that long rather than exactly it. With no
  automatic slide left after it to take up the difference — filling the music, with only own
  durations the rest of the way — it keeps its own duration exactly instead, and the boundary
  before it (automatic or own) does too.
- **The same timing everywhere**: player, video export and web page export compose with the beats
  found so far; until a result exists the even share plays.

## Options weighed

- _web-audio-beat-detector_ (MIT, 3 dependencies) — fast, but returns one tempo and one offset,
  i.e. a constant grid: it drifts off a song that changes tempo (F 0.46), doubles or misreads
  slow and triple-metre music, fails on a plain click track and finds a tempo in beatless music.
- _music-tempo_ (BeatRoot, MIT) — accurate beat lists, but doubled the tempo of a plain drum
  pattern, failed on the break, has no confidence (180 BPM on the ambient pad), is 3–4× slower
  than the own detector and unmaintained since 2022.
- _realtime-bpm-analyzer_ (Apache-2.0) — tempo candidates only, no beat positions; several wrong.
- _essentia.js_ — rejected unmeasured: AGPL-3.0 and 10 MB of WebAssembly.
- _A constant-tempo grid_ (first beat and beat length) instead of the beat list — smaller and
  simpler to carry, but a live recording or a song that speeds up drifts off it within a minute.
- _Carry the beats in `.glissando` files_ — saves the receiver about a second, but needs format
  room for a derived result and freezes today's detector into every file.

## Addendum: phrase starts

The beat list carries no bar or phrase information, so a boundary prefers every fourth beat of
the list (`BEATS_PER_PHRASE`, counted from the playlist's first beat) over the nearest beat when
that is at most half a beat further from where the even share puts it. A change then sits where
the music turns more often, at the cost of up to half a beat of evenness. Counting from the
playlist start is exact for the first song only; after a song change the phrase grid is a guess
that still keeps within half a beat of the nearest beat. A full beat of tolerance was tried and
rejected: slides of 5 s varied by 1.4 s.

## Addendum: server slideshows

A slideshow on the Glissando server (ADR-0018) keeps its beats on the server, beside its music:
the first device that opens it in the player or the music editor listens with the same decode,
detector and worker and stores the result there (`PUT /api/library/music/{id}/beats`); every
other device reads it instead of listening again. The server only stores and validates the
result, it never decodes music itself — that would put an audio decoder in the service image.
Two devices opening the same slideshow at once may both listen; the later result replaces the
earlier, and the same detector gives the same answer. Music a device cannot decode keeps no result
anywhere, so a device that can decode it listens later.

## Consequences

- A phone spends about 1.5 s of worker time per 3 minutes of music, once per track; the main
  thread only decodes.
- Until the pass has run, a fresh slideshow plays evenly; the music editor says it is listening.
- The detector was measured on generated music; real recordings may need its threshold or its
  tempo preference tuned, which changes only `src/beats/`.
- A better detector later reaches every track by clearing the `beats` store in a database
  upgrade.
