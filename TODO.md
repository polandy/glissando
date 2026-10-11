# Todo / roadmap

One line per item, newest at the end. A finished item is deleted.

## Open

- [ ] Share a server slideshow by link — concept agreed: only slideshows on the Glissando server (pictures in Immich); `https://<host>/s/<token>` (128-bit random, stored hashed, revocable, valid until revoked); public only under `/s/` and `/api/share/<token>/` (one Authelia bypass rule, documented); pictures served by slideshow index, checked by the Node service via Caddy `forward_auth` so the Immich key stays in Caddy; recipients get no Immich ids or file names; live (edits show at once); watch only (the web-page-export player fed by fetches); pictures in 4K — source (Glissando renders a metadata-free 3840×2160 JPEG vs. Immich preview raised to 2160) to be investigated when the feature starts; "Share link" sheet in the info panel; mockup first (2026-10-11)
- [ ] Cut the tokens every session pays for — one docs PR; each step shrinks what agents load or re-read (2026-10-11)
  - Split `dev-docs/APP.md` (32 KB, 10 sections) into one file per section; update the references in code comments and docs.
  - Drop the memory entries CLAUDE.md already covers (no attribution, one PR per session, PR flow, token-lean process, mockup first, local CI before push, no history in comments).
  - Move CLAUDE.md's "Working agreement" and "Testing" detail to `dev-docs/WORKFLOW.md`, one pointer line each (~2–3 KB less in every agent context).
  - Make `scripts/e2e.sh` and `scripts/browser-tests.sh` quiet on success like `verify.sh`, printing only failing cases.
  - Split `src/player/slideshow-player.ts` and `PictureEditorScreen.svelte`, both at the ~300-line limit.
