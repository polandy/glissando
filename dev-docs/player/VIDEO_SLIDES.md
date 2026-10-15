# Video slides

A **video slide** is a picture slide that plays a clip (roadmap 12, ADR-0034, ADR-0035). It keeps
everything a picture slide has — its place in the order, its transition, its caption, its poster
for thumbnails and the blurred fill — and swaps Ken Burns for the clip. Mockup:
https://polandy.github.io/glissando-assets/mockups/video-slides/.

## Decisions

| Topic         | Decision                                                                                                                                                 |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Model         | A stored picture with an optional `video`; its picture is the **poster** frame (ADR-0034)                                                                |
| Stored bytes  | The original file as chosen, never re-encoded; accepted when this browser can play it (ADR-0034)                                                         |
| Length        | The chosen excerpt, 0.5 s to 5 min; a fixed own duration, like ADR-0008                                                                                  |
| Sound         | On by default; the music ducks to 15 % while a clip with sound plays (ADR-0035)                                                                          |
| Decoder       | `<video>` in the player, WebCodecs through mediabunny in the video export (ADR-0035)                                                                     |
| Network       | Clips are downloaded whole before they play, from Immich; never streamed (ADR-0034). The server keeps no clips: a server slideshow holds no video slides |
| Portrait pair | A video slide is never composed into a portrait pair; a portrait clip gets the blurred fill (ADR-0028)                                                   |

## Import

- Videos come in through the same picker as pictures, mixed in capture order. A picture list shows a
  video with a length badge; Immich videos are no longer hidden (`IMMICH.md`).
- Capture time: the container's creation time (read with mediabunny, taken as device wall time
  like a photo's), then the file date. The poster is the frame at the
  start of the excerpt, downscaled like a picture (`PICTURE_IMPORT.md`) and cached as its picture.
- A video the browser cannot play is refused at its tile with its reason ("This browser cannot
  play this video format."); the rest of the batch goes on. Loading its metadata into a `<video>`
  decides: `canPlayType` is not asked, as Chrome answers "" for a `.mov` it plays.
  A source over `MAX_VIDEO_BYTES` (1 GiB) is refused the same way.
- A clip longer than 5 min is accepted; its excerpt starts as the first 5 min and the user moves it.

## Stored form

`StoredPicture.video?: StoredVideo`:

| Field       | Meaning                                                                           |
| ----------- | --------------------------------------------------------------------------------- |
| `mediaId`   | the original file in the `videos` object store (bytes + type)                     |
| `sourceMs`  | the whole clip's length, whole ms                                                 |
| `startMs`   | where the excerpt starts, whole ms of the clip                                    |
| `endMs`     | where it ends; `endMs − startMs` is 500 to 300000                                 |
| `volume`    | 0 to 100 in steps of 5; absent: 100; 0 is "sound off"                             |
| `duckMusic` | `false` lets the music keep its volume; absent: the music ducks (only with sound) |

`width` and `height` are the poster's. The stored picture's `durationMs` is not used for a video
slide: its duration is `endMs − startMs`. Edits validate (`checkVideoExcerpt`, `checkVideoVolume`)
and fail loud with the field and value. `deleteSlideshow` removes a video's bytes with the rest of
its media; `mediaBytes` counts them.

## Slideshow JSON (version 7)

```json
{
  "image": { "src": "pictures/3.jpg", "capturedAt": "2025-07-02T10:00:00Z" },
  "video": {
    "src": "videos/3.mp4",
    "startMs": 1900,
    "endMs": 10300,
    "volume": 0.8,
    "duckMusic": true
  },
  "durationMs": 8400,
  "kenBurns": {
    "from": { "zoom": 1, "centerX": 0.5, "centerY": 0.5 },
    "to": { "zoom": 1, "centerX": 0.5, "centerY": 0.5 },
    "easing": "linear"
  }
}
```

- `video` is optional on a picture slide. `image` is the poster. `durationMs` must equal
  `endMs − startMs`; `volume` is 0 to 1; `duckMusic` is optional (absent: `true`).
- A video slide has a still framing (`from` equals `to`, zoom 1) and no `partner`.
- Every fault is a `SlideshowFormatError` at its path, e.g. `slides[2].video.endMs`.
- The player rejects a version below 7 as before (no instance holds older slideshows).

## Timing

The slide clock leads; the clip follows it, never the other way round.

- Slide time `t` shows clip time `startMs + t`. A transition into a video slide starts the clip at
  the start of the transition; a transition out of it shows the clip's last frames while it plays.
- While the slide time is negative (the lead-in), the clip time is `startMs + slide time` clamped
  at 0, so frames before the excerpt can show during the transition into the clip.
- Seeking the show puts the clip at `startMs + t` (the poster is drawn until the frame is ready).
- A clip that cannot keep up (stalled decoder, slow network source) holds its last frame and
  catches up by seeking; the show's time is never stretched.
- With reduced motion nothing changes: a clip is content, not decoration.

## Sound and ducking

- A slide's clip sound is audible for the slide's own duration, at `volume`.
- The music volume is multiplied by the **duck factor**: 1 outside a clip with sound; `0.15`
  (`VIDEO_DUCK_VOLUME`) inside it, with `VIDEO_DUCK_RAMP_MS` = 400 ms linear ramps starting
  400 ms before the slide so the music is already low when the clip starts and back up 400 ms
  after it. Pure function `duckFactorAt(timeMs, spans)` in `src/player/`; the music's own
  trim and fades (ADR-0009) multiply on top.
- Two clips closer together than twice the ramp stay ducked between them.
- Safari starts sound only after a user gesture; the player's play button is that gesture.
  A refused clip sound is a `MusicPlaybackError`-style player error (`VideoPlaybackError`).

## Composition

- The composer emits a video slide's `video` from the stored one; the slide has no Ken Burns
  (still framing) and its transition and caption follow the picture's rules.
- Duration: a fixed own duration (ADR-0008): with music the other pictures share what is left
  (ADR-0022); on the beat the video's own length is not snapped (ADR-0021).
- A card (ADR-0032) may sit over a video slide's poster background, never over the playing clip.

## Targets

| Target             | Behaviour                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App player         | `<video>` per clip, frames uploaded to the slide's texture each frame (WebGL) or shown (DOM)                                                            |
| Video export (MP4) | Frame-accurate decode with mediabunny; the clip sound is mixed with the music, ducked                                                                   |
| HTML export        | The clip's bytes embedded in the file; the export sheet names the size beforehand                                                                       |
| `.glissando` file  | Format 14 holds `videos/clip-<n>` entries (stored, ADR-0004) and a picture's `video`; 13 is still read                                                  |
| Server slideshow   | None: the server links Immich photos and keeps no clip, so a video slide is left out when a slideshow is saved there, as a device picture is (ADR-0018) |
| Share link         | None: a share is of a server slideshow, which holds no clip; nothing is fetched or streamed                                                             |
| Immich             | The clip is downloaded as Immich's playable version and then lives on the device (ADR-0013)                                                             |
| TV remote          | Unchanged                                                                                                                                               |
