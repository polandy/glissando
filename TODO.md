# Todo / roadmap

One line per item, newest at the end. A finished item is deleted.

## Open

- [ ] Investigate the video freeze before a video slide ends (picture holds, sound plays; title slide then video, cropped and not) — not reproducible in headless Chromium with a generated 720p clip; test on another device and note clip codec, resolution and browser; if a large clip is the cause, cap the live frame size and upload per decoded frame (`dev-docs/player/VIDEO_SLIDES.md`) (2026-10-15)
- [ ] Give each action one way in on the slideshow screen — two Play controls, an Add button and an Add tile, Select and "hold to select", "Open .glissando file" on the start screen and again in the pictures step; mockup first (2026-10-25)
- [ ] Gather sharing in one Share button beside Play — video, web page and file sit in the ⋯ menu, the link in Details, and the .glissando file downloads without a sheet; mockup first (2026-10-25)
- [ ] Drop "Focus … All looked at" from the ⋯ menu or name it in user language — the progress belongs in the global indicator (2026-10-25)
- [ ] Keep the "Slideshow created — tap Play" toast from covering content — it lies over the Details, the picture and music editors and even the next import; end it when leaving the slideshow screen (2026-10-25)
- [ ] Set labels in the text font, not Geist Mono — "Title slide", "Closing slide" and "Add" tiles break `dev-docs/BRAND.md` (mono for times, counts, dates only); check every use (2026-10-25)
- [ ] Rework the sample-music tiles — Play and + sit over the title, descriptions are cut ("Warm·harmo…"); mockup first (2026-10-25)
- [ ] Show one preview in the picture editor on a phone — the frame editor and the live preview are stacked full size; switch between frame and play, drop "Zoom 1.00×"; mockup first (2026-10-25)
- [ ] Slim the selection bar — 7 icons, the bookmark for "Insert chapter" is unclear, the selected tile has its own X too; rare actions behind ⋯, the chapter action labelled (2026-10-25)
- [ ] Show the music editor simple first — order, start and end up front; loudness curves and hatched crossfades on demand; drop the empty "Loudness of the songs" card (2026-10-25)
- [ ] Move the "Automatic chapters" switch out of the chapter dialog — a slideshow-wide setting inside one chapter's dialog; keep it in the slideshow's settings only (2026-10-25)
- [ ] Fix the player's slide-to-picture mapping — `PlayerLayer.svelte`'s `onSlide` looks up `played.pictures[slideIndex]`, but a title card or a portrait pair shifts slides against pictures, so the prepare flow marks the wrong picture as passed; map by the slide's own image (and partner) instead (2026-10-26)
