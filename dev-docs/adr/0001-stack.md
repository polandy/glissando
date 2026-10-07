# ADR-0001: Stack — TypeScript, Svelte 5, Vite; optional Node server

**Status:** accepted

## Context

Glissando is a local-first web app, installable as a PWA, made for offline use with all work done
in the browser (`dev-docs/SCOPE.md`). The MVP turns local pictures and music into an automatic slideshow:
WebGL2 transitions and Ken Burns over a JSON slideshow, played offline. A full editor with drag &
drop and a timeline follows.

## Decision

- **TypeScript everywhere**, so the slideshow JSON schema and its types are shared by player,
  app and server.
- **Player engine as framework-free TypeScript + WebGL2**, usable without the app shell.
- **Svelte 5** for the UI: it compiles away, keeps the bundle small, and suits the editor.
- **Vite** builds and serves; **Vitest** for unit tests; npm with a committed lockfile.
- **Node** for the optional server, added when the first network extra lands (Immich proxy,
  sync, TV control). The app itself is static files and runs without it.

## Options weighed

- _Server in Go_ — single small binary and image, fewer dependencies; rejected because it means
  two languages and the schema maintained twice, while the optional server stays thin anyway.
- _React_ — largest ecosystem; rejected for bundle size and dependency count.
- _No framework_ (web components) — fewest dependencies; rejected because the editor would
  rebuild what a framework gives.
- _Desktop app (Tauri)_ — real file-system access; rejected because an installed PWA runs just as
  well offline, on every device including phones and TVs, with nothing to install per platform.
- _Library only_ — rejected: the product is for end users, not developers.

## Consequences

- A larger server image than Go would give — only for those who run the optional server.
- The engine/app boundary is a rule (CODING_PRINCIPLES §7), enforced in review.
- PWA features require installing from an HTTPS host (or `localhost`).
