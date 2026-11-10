# Todo / roadmap

One line per item, newest at the end. A finished item is deleted.

## Open

- [ ] Work through the code-review findings — `TODO-code-review.md`, MED first, one PR per item or area (2026-11-03)
- [ ] Server (Immich) slideshows stutter on a MacBook Air M3 (Firefox) where the same slideshow as a .glissando file plays smoothly: "auto" quality picks 4K on any screen with a short edge over 1440 device px (1470×956 at DPR 2 = 1912), so `serverRenditionFor` downloads each Immich original and decodes it on the device during playback (`pictureBlob` → `decodeImmichPhoto`) instead of the stored display rendition a device slideshow plays; measure that path on a 4K-auto screen and decide between prepare-ahead headroom, Immich's fullsize rendition or 1440 by default (2026-11-09)
- [ ] E2E-083 flaked once in CI WebKit (PR #325, run 42712513385): after the forced `clickSwitch` on the Mood sheet's "Folgt der Energie der Musik" (click done, 166 ms after "scrolling into view"), the switch stayed unchecked for 5 s; 34 local WebKit runs pass, also at 2 CPUs × 4 workers — find whether the forced click lands off the scrolled input or the edit is lost (2026-11-09)
