# CLAUDE.md — Glissando

Local-first **slideshow software**: a web app, installable as a PWA, made for offline use; a server is optional.

- Scope, product principles, MVP and ordered roadmap: `dev-docs/SCOPE.md`
- Stack — TypeScript, Svelte 5, Vite; framework-free WebGL2 player engine: `dev-docs/adr/0001-stack.md`
- Brand, palette "Sorbet", font: `dev-docs/BRAND.md`

This file is loaded in full by every session and every subagent, so it holds the rules and
pointers only. Detail lives in `dev-docs/`. **Don't grow it** — move detail out, keep a pointer.

## Commands

- **Verify before finishing**: `npm run verify` — mirrors CI 1:1, quiet, a failing step in full.
- Fast unit tests: `npx vitest run <path>`. Dev server on the LAN: `npm run dev`.
- Failures of a red CI run only: `scripts/ci-failures.sh [branch]`.
- E2e cases locally, in the same pinned image as CI: `scripts/e2e.sh [playwright args]`.
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
- **Split a source file past ~300 lines** before it grows further.

## Where things live

| Question                  | File                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------- |
| What is the product?      | `dev-docs/SCOPE.md`                                                                |
| How do I write code here? | `dev-docs/CODING_PRINCIPLES.md` — **binding**, read once before writing anything   |
| Why X over Y?             | `dev-docs/adr/` — only for a real tradeoff (options weighed, one chosen at a cost) |
| Owner's open work         | `TODO.md` (the `/todo` skill), **HIGH** first                                      |

- Only the current version of each document is kept — never a "v2"; git holds the history.
- A behaviour change updates the matching doc in the same change. A user-visible change updates
  the user docs, verified against the code.

## Testing

- **Test-first**: every behaviour starts as a failing test whose name reads as its specification.
  See it fail once, then make it pass.
- **No test may race**: no sleeps, fixed waits or polling for an effect that only probably lands;
  no wall clock, no ambient randomness. Give the production code a seam (injected clock, a
  settled/completion signal) instead.
- **An absence needs a positive signal** — assert what must still be there before what is gone.
- **Prove it can fail**: break the behaviour and watch exactly that case go red.

## Working agreement

- **Never commit to `main`.** One git worktree per feature **beside** the checkout
  (`git worktree add -b <type>/<slug> ../glissando-<slug> origin/main`, never under `.claude/`)
  → PR → green CI → `/pr-review` on your own PR (start it unasked) → **wait for the merge
  go-ahead**. Squash-merge with a hand-written Conventional Commit subject; `main` stays linear.
  After the merge: remove the worktree, delete the branch locally and remotely, `git fetch --prune`.
- **The merge is its own grant.** "Commit", "push", "open a PR" never authorise it; green CI is the
  stopping point. A go-ahead for one PR never carries to the next.
- **The shell's cwd is the hazard**: one `cd` into the main checkout persists, and a later commit
  lands there. Use `git -C <path>`; check `git branch --show-current` right before commit/push.
- **"Next free" ids race** (ADR numbers, e2e case ids): pick against live state — `git fetch`,
  open PRs, sibling worktrees — and re-check after merging `main` in.
- **One open feature PR per session.** Release PRs don't count.
- **One task per session, under ~150k context**; review/merge/clean-up run in a fresh session.
  A subagent past ~120k context or ~150 turns stops and returns a hand-off (branch, done, open,
  next command).
- **A feature PR is complete**: logic + the UI that exposes it + docs + an ADR when a real
  tradeoff was decided. Never "UI in a follow-up", never "docs later" — and never a spec- or
  ADR-only PR merged ahead of its code.
- **UI: mockup first.** A UI feature starts as an interactive HTML mockup published as an
  Artifact; specs and code follow only after the owner approves it. A UI change ships a running
  e2e case, written **after** the owner's OK on the built change, in the feature's own PR.
  Judge rendering from pixels (a screenshot), never by reasoning about the stylesheet; a UI PR
  shows its change as 2–3 small cropped screenshots, not prose — hosted in
  `polandy/glissando-assets` (`pr-<n>/`), never committed here.
- **Before push**: the verify target plus every job the diff can obviously break (the affected
  e2e cases, visual baselines when a screen moved). The rest stays on GitHub.
- **English throughout** — code, comments, docs, commits, PR text. The owner's German is
  translated, never quoted. German only as content (UI copy, seed data).
- **No attribution lines**: no `Co-Authored-By`, no "Generated with" — not in commits, not in PRs.
- **Conventional Commits** with exactly `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`
  (`build:` only from Dependabot), type by user-facing impact; releases by release-please.

## Code rules (full text in `dev-docs/CODING_PRINCIPLES.md`)

- Readability over cleverness; names say _what_, comments say _why_ — and describe the current
  state only, never history ("used to", "no longer", dates, provenance).
- Pure domain logic, I/O at thin edges, dependencies injected (no globals, no singletons).
- No magic strings or numbers; strict typing (no `any`); fail loud at boundaries.
- Minimal exposure, minimal dependencies (a new one needs a one-line justification).
- **Everything pinned to an exact version verified by hash** — lockfiles committed, frozen
  installs, container images by `@sha256:`, Actions by full commit SHA.
- Colours, type and icons come from design tokens, never raw values.
