# Todo / roadmap

One line per item, newest at the end. A finished item is deleted.

## Open

- [ ] Fix the rare WebKit stall of the play tests (`page-export`, `share-page` browser tests: state `playing`, time stands at 0:00): not reproducible in ~45 stressed CI runs after the per-engine CI split; the next failure prints a report (animation frames in page and test frame, both frames' places in view, progress) that names the cause — fix it test-first from that (2026-10-11)
- [ ] Keep portrait pairs and alone marks when a .glissando file is imported — `write-glissando-file.ts` drops `portraitPictures` and `picture.alone` (GLISSANDO_FILE.md); fix test-first with an export → import round trip (2026-10-14)
- [ ] Move the picture-frame setup out of the top of the start page — mockup approved (option D): the card stays on top but gets a ✕ that hides it, remembered in the browser; Settings gets a "Picture frame" section with "Set up a picture frame" and a "Show the card on the start page" switch that brings it back; the `#frame=` deep link is unchanged; update `dev-docs/app/FRAME.md` and the user docs, e2e after the owner's OK on the built change. Mockup: https://polandy.github.io/glissando-assets/mockups/frame-setup-placement/#optD (2026-10-14)
- [ ] Offer a demo slideshow on GitHub Pages — lets a visitor see Glissando play without bringing pictures (public-domain or generated images only) (2026-10-14)
- [ ] Make README.md really attractive — the first impression on GitHub: what it is, screenshots/animation, install link (2026-10-14)
- [ ] Offer sample music — royalty-free tracks a user can pick for a show without bringing their own (2026-10-14)
- [ ] Detect animals in a picture to drive an effect — e.g. framing or pan towards the animal (2026-10-14)
- [ ] Detect landscapes in a picture to drive an effect — e.g. a slow wide pan for scenery (2026-10-14)
- [ ] Further optimise picture changes on the music — sharper alignment of transitions to the beat/phrases (2026-10-14)
- [ ] Show a picture full screen in the picture selection — the thumbnail is often too small to judge a picture (2026-10-14)
- [ ] Select several pictures at once in the picture selection — a range with Shift (and single additions with Ctrl/Cmd) instead of one click per picture (2026-10-14)
