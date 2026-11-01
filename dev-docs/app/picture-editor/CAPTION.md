# Caption

- **Caption** (`CaptionField.svelte`): below the Ken Burns section, after a hairline, the
  eyebrow "Caption" with the counter "14 / 80" (mono, characters as typed, an emoji counting as one) right of it; a
  one-line field (typing and pasting stop at 80 characters as the counter counts them, the
  caret staying put; the counter and hint describe it to a screen reader; placeholder "e.g. Evening on the jetty", Enter key labelled
  "done") with a ✕ inside on the right while it holds text, which empties it and keeps the
  focus; the hint "Shown bottom left in the player, fading in and out with the picture. Empty:
  no caption." Every keystroke is stored at once, normalised (`normalizeCaption`: whitespace
  runs become one space, trimmed, at most 80 characters; nothing left removes the caption; clearing it with the field's clear button raises the toast "Caption cleared" with "Undo", which brings the previous text back), and
  a keystroke that changes nothing stored stores nothing. Enter leaves the field; leaving it
  tidies the text to what is stored. Nothing is filled in automatically. The preview shows
  the caption in the player's place, size and type over a 16:9 screen (`captionStyles`, type
  at least 10 px so the small screen keeps the player's proportions); it wraps with CSS like
  the DOM fallback, so its line breaks can differ from the WebGL player's.
