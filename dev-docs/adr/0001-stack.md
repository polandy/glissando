# ADR-0001: Stack — TypeScript, Svelte 5, Vite; thin Node server

**Status:** accepted

## Context

Glissando is a self-hosted web app, installable as a PWA, with the work done client-side
(`dev-docs/SCOPE.md`). The MVP turns local pictures and music into an automatic slideshow:
WebGL2 transitions and Ken Burns over a JSON slideshow, played offline. A full editor with drag &
drop and a timeline follows.

## Decision

- **TypeScript everywhere**, so the slideshow JSON schema and its types are shared by player,
  app and server.
- **Player engine as framework-free TypeScript + WebGL2**, usable without the app shell.
- **Svelte 5** for the UI: it compiles away, keeps the bundle small, and suits the editor.
- **Vite** builds and serves; **Vitest** for unit tests; npm with a committed lockfile.
- **Node** for the server, added when the first server-side need lands (storage/sync). The
  player MVP is static files and needs none.

## Options weighed

- _Server in Go_ — single small binary and image, fewer dependencies; rejected because it means
  two languages and the schema maintained twice, while the client-first server stays thin anyway.
- _React_ — largest ecosystem; rejected for bundle size and dependency count.
- _No framework_ (web components) — fewest dependencies; rejected because the editor would
  rebuild what a framework gives.
- _Desktop app (Tauri)_ or _library only_ — rejected: the owner wants a self-hosted app usable
  on every device.

## Consequences

- A larger runtime image than Go would give.
- The engine/app boundary is a rule (CODING_PRINCIPLES §7), enforced in review.
- PWA features require HTTPS in front of the server.
