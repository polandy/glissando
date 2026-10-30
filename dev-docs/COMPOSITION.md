# Composing a slideshow

`src/compose/` makes the automatic ("good by default") choices that turn a `StoredSlideshow`
into the playable `Slideshow` JSON (`dev-docs/PLAYER.md`). Pure, framework-free functions; no
I/O, no subject detection.

One file per section in `composition/`; open only the one a change touches.

| Section                                                           | What it covers                                          |
| ----------------------------------------------------------------- | ------------------------------------------------------- |
| [Order and title](composition/ORDER_AND_TITLE.md)                 | Picture order, the automatic title                      |
| [Slide units](composition/SLIDE_UNITS.md)                         | Portrait pairing, video slides                          |
| [Durations](composition/DURATIONS.md)                             | Picture timing, filling the music, snapping to the beat |
| [Ken Burns](composition/KEN_BURNS.md)                             | Automatic and own motion, the focus                     |
| [Caption and transitions](composition/CAPTION_AND_TRANSITIONS.md) | Captions, the automatic and own transition              |
| [Music](composition/MUSIC.md)                                     | Playlist order, crossfades, fades                       |
| [Title and closing cards](player/TITLE_CARD_COMPOSITION.md)       | Title and closing slides as cards, ground slides        |
| [Entry points](composition/ENTRY_POINTS.md)                       | The functions callers use                               |
