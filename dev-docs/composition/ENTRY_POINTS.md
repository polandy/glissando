# Entry points

- `buildStoredSlideshow` applies the order and title to a fresh import.
- `composeSlideshow` turns a stored slideshow into the player's JSON, resolving picture and
  music ids to URLs through an injected `SlideshowSources`; the pictures' focus comes in as a
  map by picture id (`LibraryStore.pictureFocus`), the songs' beats as a map by music id (`SongBeats`, from
  `LibraryStore.musicBeats` per song; a song not listened to yet is absent), and the songs'
  loudness (`SongLoudness`, from `LibraryStore.musicLoudness`; absent until measured, `gain` 1
  meanwhile, ADR-0040) — all three read when the player or an export starts — play never waits
  on the search for the rest.
- `slideDurationsMs` with `picturesFillMs` and `playlistBeatsMs` gives the editors the same timing: the music
  editor's lane and the picture editor's duration and transition (`beatTransitionDurationMs`)
  follow the beats as the background pass finds them.
- `pictureDurationsMs` wraps `slideUnits` and `slideDurationsMs` to give one duration per
  picture, broadcasting a pair's shared duration to both halves, for UI that shows a picture's
  own timing (the picture editor, the "add pictures" note).
- `slideshowDurationMs` sums a stored slideshow's slide durations, own ones included, for a
  "12 pictures · 1:00" summary; without the beats, so with pictures lasting their seconds it can
  differ from the played length by part of a beat.

See `dev-docs/adr/0002-transitions-inside-slide-durations.md` for why a transition runs inside
its slide's duration, and `dev-docs/PLAYER.md` for the JSON contract these functions produce.
