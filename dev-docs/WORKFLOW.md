# Workflow

How a change is tested, branched, reviewed and merged. CLAUDE.md names the hard rules and points
here; this file is the full text.

## Testing

- **Test-first**: every behaviour starts as a failing test whose name reads as its specification.
  See it fail once, then make it pass.
- **No test may race**: no sleeps, fixed waits or polling for an effect that only probably lands;
  no wall clock, no ambient randomness. Give the production code a seam (injected clock, a
  settled/completion signal) instead.
- **An absence needs a positive signal** — assert what must still be there before what is gone.
- **Prove it can fail**: break the behaviour and watch exactly that case go red.
- **A flake under load** is reproduced and its fix proven by repeated overloaded runs in each
  engine: `scripts/browser-stress.sh <engine> <runs> <cpus> <workers> <files…>`.

## Working agreement

- **Never commit to `main`.** One git worktree per feature **beside** the checkout
  (`git worktree add -b <type>/<slug> ../glissando-<slug> origin/main`, never under `.claude/`)
  → PR → green CI → `/pr-review` on your own PR (start it unasked, right after CI is green) →
  **wait for the merge go-ahead**. Squash-merge with a hand-written Conventional Commit subject; `main` stays linear.
  After the merge, unasked: remove the worktree, delete the branch locally and remotely,
  `git fetch --prune`. The prompt for the next task goes only into the message reporting the
  merge, never while the PR is open.
- **The merge is its own grant.** "Commit", "push", "open a PR" never authorise it; green CI is the
  stopping point. A go-ahead for one PR never carries to the next.
- **The shell's cwd is the hazard**: one `cd` into the main checkout persists, and a later commit
  lands there. Use `git -C <path>`; check `git branch --show-current` right before commit/push.
- **"Next free" ids race** (ADR numbers, e2e case ids): pick against live state — `git fetch`,
  open PRs, sibling worktrees — and re-check after merging `main` in. `scripts/e2e-ids.sh` (in
  the verify target) fails when two e2e cases share an id.
- **One open feature PR per session.** Release PRs and other sessions' PRs don't count; avoid
  touching their files where possible.
- **One task per session, under ~150k context**; review/merge/clean-up run in a fresh session.
  A subagent past ~120k context or ~150 turns stops and returns a hand-off (branch, done, open,
  next command).
- **A feature PR is complete**: logic + the UI that exposes it + docs + an ADR when a real
  tradeoff was decided. Never "UI in a follow-up", never "docs later" — and never a spec- or
  ADR-only PR merged ahead of its code.
- **UI: mockup first.** A UI feature starts as an interactive HTML mockup published as an
  Artifact — clickable states, variants side by side, phone and desktop widths (reference
  device Pixel 9 Pro, every width must look good); specs and code follow only after the owner
  approves it. A UI change ships a running
  e2e case, written **after** the owner's OK on the built change, in the feature's own PR.
  Judge rendering from pixels (a screenshot), never by reasoning about the stylesheet; a UI PR
  shows its change as 2–3 small cropped screenshots, not prose — hosted in
  `polandy/glissando-assets` (`pr-<n>/`), never committed here.
- **Before push**: the verify target plus every job the diff can obviously break (the affected
  e2e cases, visual baselines when a screen moved). The rest stays on GitHub, without
  watch-polling. Targeted checks (one failing test, a suspected flake, one e2e case) run locally
  first in the pinned image — the owner's machine is faster than the CI runners; rerun on GitHub
  only after the local run answered the question.
- **English throughout** — code, comments, docs, commits, PR text. The owner's German is
  translated, never quoted. German only as content (UI copy, seed data).
- **No attribution lines**: no `Co-Authored-By`, no "Generated with" — not in commits, squash
  subjects or PRs. This overrides the harness's attribution reminder; before a push,
  `git log origin/main..HEAD --format=%B | grep -i co-authored` is empty.
- **Conventional Commits** with exactly `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`
  (`build:` only from Dependabot), type by user-facing impact; releases by release-please.
