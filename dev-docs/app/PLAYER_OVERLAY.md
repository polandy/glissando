# Player overlay

`player/PlayerOverlay.svelte` takes a `Slideshow` (and an `openPicture` for stored media), fills the viewport in black, starts playing
and asks for fullscreen where the browser has the Fullscreen API (a refusal is logged at debug
level). Closing destroys the player.

- A tap toggles the controls. While playing they hide after 2.5 s; paused or ended they stay.
  They fade in `CAPTION_GLIDE_MS` (0.3 s), the time captions glide with them; the fade is off
  with reduced motion.
- Top: close, the title with the current slide's capture date, "3 / 12" counting slides (a
  portrait pair is one slide, ADR-0028) and a fullscreen button (hidden without the Fullscreen
  API). Bottom: the key hint (above 720 px), the seek bar with one tick per slide, the white play/pause button, "0:12 / 1:00" and the music's name.
- Captions (ADR-0007) are drawn into their slide by the player, bottom left
  (`PlayerCaption.svelte`); while the controls show, the player's `captionInset` lifts them
  above the bottom bar's controls (its height without the fade above them, `caption-inset.ts`),
  and back down when they hide, gliding there with the controls (0.3 s, CSS `ease`). They never
  sink below the screen's bottom safe area (`env(safe-area-inset-bottom)`, measured by a hidden
  probe), so a phone's home indicator stays clear; a video export has no such inset. The first
  placement after opening, and every move under reduced motion, is instant
  (`jumpCaptionInset`). A visually hidden polite live region, outside the controls, holds the
  current picture's caption for screen readers; it is empty when the player opens and filled
  right after, so the first caption is announced too.
- Keys: Space play/pause, ←/→ previous/next picture, Esc close, F fullscreen. "Previous" more
  than a second into a picture restarts it, else goes to the one before.
- At the end an "End" card offers "Again" and "Close"; it never jumps back by itself.
- A picture that fails to load shows a short message with "Close". Music the browser refuses
  to start leaves the player paused with the controls showing; play retries.
