# Todo / roadmap

One line per item, newest at the end. A finished item is deleted.

## Open

- [ ] Fix the rare WebKit stall of the play tests (`page-export`, `share-page` browser tests: state `playing`, time stands at 0:00): not reproducible in ~45 stressed CI runs after the per-engine CI split; the next failure prints a report (animation frames in page and test frame, both frames' places in view, progress) that names the cause — fix it test-first from that (2026-10-11)
