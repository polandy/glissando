# Ken Burns

Zoom alternates in/out by slide index between `MIN_KEN_BURNS_ZOOM` and 1.2; a gentle horizontal
pan alternates direction with it. The motion swings around the picture's focus — the centre of
the subject box the on-device detection found (`PictureFocus`, ADR-0012), each pan end kept
inside the picture. The box surrounds the whole group (ADR-0029), so when it is wider or taller
than the frame at zoom 1.2 (its larger side grown by 15%) the motion's largest zoom drops until
it fits, down to 1. Without a subject (nothing found, or not looked at yet) a portrait picture's
centre is raised toward where faces usually sit and a landscape picture's stays in the middle.
Easing is always `linear`. A picture with an own motion (set in the picture editor, stored as
`StoredPicture.kenBurns`, ADR-0006) plays that one instead, wherever it sits, with the same
easing (`pictureKenBurns`): the automatic motion follows the position, an own one stays with
its picture. A composed pair's two halves (`pairKenBurns`) each get the automatic motion for
the slide index, aimed at their own focus, but with no horizontal pan — `from.centerX` equals
`to.centerX` — so the two stay in step; the zoom still alternates by index, the same direction
for both halves.

Under a mood ([MOOD](../app/slideshow-editing/MOOD.md), ADR-0045), the motion's strength is its
own instead of the standard one.
