# Title slide and closing slide

Mockup: https://polandy.github.io/glissando-assets/mockups/title-slides/. Player look and timing:
[player/TITLE_CARDS.md](../../player/TITLE_CARDS.md). ADR-0032.

## Stored

`StoredSlideshow.openingCard` and `closingCard` are optional. Each card is:

| Field        | Value                                                                                |
| ------------ | ------------------------------------------------------------------------------------ |
| `title`      | text by the caption rule; empty means the slide is not shown                         |
| `subtitle`   | text by the caption rule, may be empty                                               |
| `style`      | `modern` · `quiet` · `bold` · `classic`                                              |
| `position`   | `centre` · `bottom-left`                                                             |
| `background` | `{ kind: "colour", colour }`, a swatch id, or `{ kind: "picture", pictureId, fade }` |
| `motion`     | boolean. Opening: reveal. Closing: fade in. Only applies on a picture background     |

- `fade` is a whole number from 0 to 100, in steps of 5. The veil amount is `fade / 100`.
- The swatches are `plum` `#2A2340`, `night` `#14111C`, `cream` `#FFF3E2`, `peach`
  `#FFB59A`, `mint` `#8FD9C4` and `lemon` `#FFD95A` (BRAND.md, card palette).
- When a card's picture is removed from the slideshow, its background moves to the first
  picture (opening) or the last picture (closing). If no picture is left, it becomes `plum`.
- Both cards go into the `.glissando` file (version 12) and the server document, in the same
  way as `portraitPictures`.

## In the editor

- The picture strip has a **Title slide** tile before the first picture and a **Closing
  slide** tile after the last one. The tiles do not move with dragging or selecting.
- A card that is absent or has an empty title shows a dashed tile with "+" and its label.
  Otherwise the tile shows a small still of the card, taken at the end of its enter phase.
- Tapping a tile opens the card sheet: a bottom sheet on the phone, a dialog from 720 px.
  Opening an absent card creates it with defaults:
  - **Title slide:** the title is the slideshow's title, the subtitle the capture range as the
    start card shows it, style `modern`, `centre`. The background is the first picture at fade
    60, with reveal on.
  - **Closing slide:** an empty title (placeholder "Thank you for watching"), an empty
    subtitle, style `modern`, `centre`. The background is the last picture at fade 60, with
    fade in on.
- The sheet, top to bottom:
  - A 16:9 **preview**, sticky at the top of the sheet. It is drawn by the DOM renderer's card
    code, with a **Play** button that runs the slide's timing once. Its enter phase plays when
    the sheet opens.
  - **Title** and **Subtitle** fields with counters out of 80.
  - **Style**: four cards, each with "Aa" set in that style.
  - **Background**: Colour | Picture. Colour shows the six swatches. Picture shows the
    slideshow's pictures, the **Fade** slider (Subtle … Strong), and the **Reveal** toggle
    (title slide) or the **Fade in** toggle (closing slide).
  - **Position**: Centre | Bottom left.
  - A one-line **hint** on the timing ("About 4 s, on the beat. With Reveal, the picture takes
    over.").
  - **Remove** (title slide / closing slide). This deletes the card, and its tile turns dashed.
- **A change updates the preview in place.** It shows the settled state at once (the text
  shown, the veil at its amount): no replay, no fade from black, and the sheet keeps its
  scroll position. Only Play and opening the sheet run the timing.
- Every change is saved as it is made, like the other sheets. Close / Escape / the backdrop
  closes the sheet.
