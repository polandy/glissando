# Code review findings — todo

Full-repo review of `main` at cccadb7 (2026-11-03), ten areas read against
`dev-docs/CODING_PRINCIPLES.md` and `dev-docs/WORKFLOW.md`. One line per item, severity first
(HIGH = bug, data loss or security; MED = likely bug or a principle violation that costs
maintainability; LOW = cleanup). A finished item is deleted; the file goes when it is empty.

Each fix starts with the failing test the item names or implies (WORKFLOW.md, Testing).

## MED

### Server, sync and TV

### Player

### Library and file format

### Import and Immich

### Exports, share and PWA

### App shell, routing and editors

### Tooling and tests

## LOW

### Server, sync and TV

### Player

### Library and file format

### Exports, share and PWA

### App shell, routing and editors

### Screens

### Tooling, docs and tests

## Not reviewed

Vendored `src/import/libav`, `src/focus/onnx` models and `pico`, `compose/compose-slideshow` and chapters, `loudness/measure-loudness`, `beats/onset-envelope`/`tempo`/`fft`, most Svelte components outside `screens/` and the editors, `deploy/test-image*.sh` and the fake-Immich scripts, the bodies of the 15 largest unit tests.

## Accepted

- `package-lock.json` — `npm audit` (dev only, low): `deepmerge` (GHSA-gcqx-w48m-w2h4) via `@sveltejs/vite-plugin-svelte`. Accepted: unreachable, the plugin merges only our own `svelte.config.js`. Revisit when vite-plugin-svelte drops or patches it; never `audit fix --force`.
