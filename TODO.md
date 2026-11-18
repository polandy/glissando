# Todo / roadmap

One line per item, newest at the end. A finished item is deleted.

## Open

- [ ] Cap the Ken-Burns zoom by detected image sharpness — not started, later (owner: not now); measure sharpness on the in-focus subject region (focus/face/saliency, e.g. variance of Laplacian) and map it to a max zoom, so a soft subject or image is zoomed less and its softness shows less (2026-11-13)
- [ ] e2e for the player controls: seek bar, tap shows/hides controls, auto-hide after 2.5 s (`page.clock`), Back > 1 s restarts the picture (2026-11-15)
- [ ] e2e for the service-worker update cycle with two real builds (new version → notice → reload), plus sample music offline (2026-11-15)
- [ ] e2e for video slides: sound and ducking against the music, MP4 export with a clip and a title card; and open an older `.glissando` fixture through the UI (ADR-0054) (2026-11-15)
- [ ] e2e for error paths: TV session edge cases (code expired, second phone takes over, TV disconnects), Immich unreachable in the import browser, folder import (2026-11-15)
