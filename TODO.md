# Todo / roadmap

One line per item, newest at the end. A finished item is deleted.

## Open

- [ ] Work through the code-review findings — `TODO-code-review.md`, MED first, one PR per item or area (2026-11-03)
- [ ] Size the demo song tiles for laptop viewports (too large at 1470×956), keeping phone and large-desktop layouts — owner decision #322 (2026-11-09)
- [ ] Server (Immich) slideshows stutter on a MacBook Air M3 (Firefox) where the same slideshow as a .glissando file plays smoothly: "auto" quality picks 4K on any screen with a short edge over 1440 device px (1470×956 at DPR 2 = 1912), so `serverRenditionFor` downloads each Immich original and decodes it on the device during playback (`pictureBlob` → `decodeImmichPhoto`) instead of the stored display rendition a device slideshow plays; measure that path on a 4K-auto screen and decide between prepare-ahead headroom, Immich's fullsize rendition or 1440 by default (2026-11-09)
