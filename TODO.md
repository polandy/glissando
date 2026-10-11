# Todo / roadmap

One line per item, newest at the end. A finished item is deleted.

## Open

- [ ] Share a server slideshow by link — concept agreed: only slideshows on the Glissando server (pictures in Immich); `https://<host>/s/<token>` (128-bit random, stored hashed, revocable, valid until revoked); public only under `/s/` and `/api/share/<token>/` (one Authelia bypass rule, documented); pictures served by slideshow index, checked by the Node service via Caddy `forward_auth` so the Immich key stays in Caddy; recipients get no Immich ids or file names; live (edits show at once); watch only (the web-page-export player fed by fetches); pictures in 4K — source (Glissando renders a metadata-free 3840×2160 JPEG vs. Immich preview raised to 2160) to be investigated when the feature starts; "Share link" sheet in the info panel; mockup first (2026-10-11)
