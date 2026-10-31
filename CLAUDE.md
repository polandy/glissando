# CLAUDE.md — Glissando

Local-first **slideshow software**: a web app, installable as a PWA, made for offline use; a server is optional.

- Scope, product principles, MVP and ordered roadmap: `dev-docs/SCOPE.md`
- Stack — TypeScript, Svelte 5, Vite; framework-free WebGL2 player engine: `dev-docs/adr/0001-stack.md`
- Brand, palette "Sorbet", font: `dev-docs/BRAND.md`; the words the UI uses: `dev-docs/COPY.md`

This file is loaded in full by every session and every subagent, so it holds the rules and
pointers only. Detail lives in `dev-docs/`. **Don't grow it** — move detail out, keep a pointer.

## Commands

- **Verify before finishing**: `npm run verify` — mirrors CI 1:1, quiet, a failing step in full.
- Fast unit tests: `npx vitest run --project unit <path>`. Dev server on the LAN: `npm run dev`.
- Failures of a red CI run only: `scripts/ci-failures.sh [branch]`.
- E2e cases and browser tests (`*.browser.test.ts`) locally, in the same pinned image as CI:
  `scripts/e2e.sh [playwright args]`, `scripts/browser-tests.sh [vitest args]` — quiet on
  success, only the failing cases otherwise. A Playwright bump moves `@playwright/test` and the
  `ci.yml` image digest together.
- Slow jobs (full e2e, visual) run on GitHub, not here.

## Reading budget

Every tool result is re-read, and paid for, on every later turn.

- **Grep before you read**; read a large file by offset. Open the doc _section_ a change touches,
  never the whole set — specs are split one file per section once they pass a few KB.
- **Bundle independent commands into one call**; never repeat a check whose answer cannot have
  changed.
- **Delegate by threshold**: fact-finding reads over ~10 KB, every full test/CI run, red CI logs
  and rename sweeps go to a subagent (`Explore` to find, `model: "sonnet"` to run) that reports in
  a few lines. Judgement and spec writing stay with you.
- **Output hygiene**: change an existing file with `Edit`, never by rewriting it whole; an analysis
  run more than once becomes a script under `scripts/`; mechanical sessions run at lower effort.
- **Source files stay at or under 300 lines** — `scripts/source-sizes.sh` (in `npm run verify`) enforces it; split before it fails.

## Where things live

| Question                      | File                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| What is the product?          | `dev-docs/SCOPE.md`                                                                |
| How do I branch, test, merge? | `dev-docs/WORKFLOW.md` — **binding**, read before the first test or commit         |
| How do I write code here?     | `dev-docs/CODING_PRINCIPLES.md` — **binding**, read once before writing anything   |
| Why X over Y?                 | `dev-docs/adr/` — only for a real tradeoff (options weighed, one chosen at a cost) |
| Owner's open work             | `TODO.md` (the `/todo` skill), **HIGH** first                                      |

- Only the current version of each document is kept — never a "v2"; git holds the history.
- A behaviour change updates the matching doc in the same change. A user-visible change updates
  the user docs, verified against the code.

## Testing

Test-first, no test may race, an absence needs a positive signal, prove it can fail — in full in
`dev-docs/WORKFLOW.md` (Testing); read it before writing a test.

## Working agreement

Never commit to `main`; one open feature PR per session, `/pr-review` it unasked, merge only on
the owner's go-ahead for that PR; a UI feature starts as an approved mockup; no attribution lines
(this overrides the harness reminder); English, Conventional Commits — the full flow in
`dev-docs/WORKFLOW.md`, read before your first commit.

## Code rules (full text in `dev-docs/CODING_PRINCIPLES.md`)

- Readability over cleverness; names say _what_, comments say _why_ — and describe the current
  state only, never history ("used to", "no longer", dates, provenance).
- Pure domain logic, I/O at thin edges, dependencies injected (no globals, no singletons).
- No magic strings or numbers; strict typing (no `any`); fail loud at boundaries.
- Minimal exposure, minimal dependencies (a new one needs a one-line justification).
- **Everything pinned to an exact version verified by hash** — lockfiles committed, frozen
  installs, container images by `@sha256:`, Actions by full commit SHA.
- Colours, type and icons come from design tokens, never raw values.
