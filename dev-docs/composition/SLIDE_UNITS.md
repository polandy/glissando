# Slide units

- **Portrait pictures** (`slideUnits`, ADR-0028): two consecutive portrait pictures (height >
  width) compose into one slide unit — `Slide.partner` — greedily from the start, never
  reordering, unless either has an own setting (motion, caption, duration, transition), is a video
  (`StoredPicture.video`) or is marked `StoredPicture.alone`. `StoredSlideshow.portraitPictures` `"one-at-a-time"` composes no
  pairs; `"fill-screen"` composes no pairs and gives every slide `Slide.fit` `"cover"`; absent is
  automatic (pairs, and a blurred fill for a whole picture the player draws instead of cropping
  it). `slideOfPicture` maps a picture's index to the slide unit that holds it, for UI that shows
  a picture's own timing; a paired picture shows its pair's. E2E-045 plays a pair side by side
  and splits it with "always alone" and the "fill the screen" setting.
- **Video slides** (`StoredPicture.video`, ADR-0034, [VIDEO_SLIDES](../player/VIDEO_SLIDES.md)): the
  slide carries `video` (`src` from `SlideshowSources.video(mediaId)`, `volume` as 0 to 1,
  `duckMusic` written only when `false`), a still framing instead of any Ken Burns, and its
  poster as `image`. Its duration is `endMs − startMs`, an own duration (ADR-0008) that is never
  snapped to the beats; the picture's `durationMs` is not used. Caption and transition follow the
  picture's rules.
