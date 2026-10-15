# Todo / roadmap

One line per item, newest at the end. A finished item is deleted.

## Open

- [ ] Fix the rare WebKit stall of the play tests (`page-export`, `share-page` browser tests: state `playing`, time stands at 0:00): not reproducible in ~45 stressed CI runs after the per-engine CI split; the next failure prints a report (animation frames in page and test frame, both frames' places in view, progress) that names the cause — fix it test-first from that (2026-10-11)
- [ ] Check the picture decode worker against the WebKit bug that swaps the bitmaps of equally sized pictures decoded at once (reproduced in the Playwright WebKit with no Glissando code; sequential decodes and main-thread decodes are right): does Safari do it with same-camera photos, and does the player need a guard? Decoding in a chain inside the worker did not help (2026-10-15)
