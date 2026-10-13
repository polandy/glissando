# Todo / roadmap

One line per item, newest at the end. A finished item is deleted.

## Open

- [ ] Fix the rare WebKit stall of the play tests (`page-export`, `share-page` browser tests: state `playing`, time stands at 0:00): not reproducible in ~45 stressed CI runs after the per-engine CI split; the next failure prints a report (animation frames in page and test frame, both frames' places in view, progress) that names the cause — fix it test-first from that (2026-10-11)
- [ ] Check whether a frame drawn while paused after a seek shows one step late in Safari — in CI's headless WebKit a WebGL context with `antialias: false` (src/player/browser-player.ts) shows it only when the canvas draws again; with `antialias: true` it is on time. Waiting on the iPad: https://polandy.github.io/glissando-assets/probes/paused-seek/ (tap 1…6 with antialias off, then on); probe in ../glissando-paused-seek-frame/probe/ (branch fix/paused-seek-frame, no commits). Lags on the iPad → fix test-first; on time → close and document the CI quirk beside keepDrawnFrames in e2e/ken-burns.spec.ts (2026-10-10)
- [ ] Frame every person in the picture with the automatic Ken Burns — with several faces the motion aims at one and crops the others; it should see the group as one unit where the picture allows (dev-docs/COMPOSITION.md, ADR-0012) (2026-10-12)
