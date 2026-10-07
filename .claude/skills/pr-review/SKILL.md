---
name: pr-review
description: Quality review of a pull request — docs/ADR sync, conformance to CLAUDE.md and dev-docs/CODING_PRINCIPLES.md, implementation quality, test coverage against the diff, the UI delivery loop, CI status (fix failures) and branch freshness. Posts the verdict as a PR comment. Use when asked to review a PR by number or branch, and unasked right after opening your own PR.
argument-hint: <PR number or branch>
---

# PR quality review

Review the PR in `$ARGUMENTS` (a number or a branch; if omitted, the current branch's PR via
`gh pr view`). Work through every section in order, fix what the instructions say to fix, hunt
for real findings rather than rubber-stamping, and finish with a verdict.

## 0. Gather context

- `gh pr view <PR> --json title,body,baseRefName,headRefName,mergeStateStatus,statusCheckRollup`
  and `gh pr diff <PR>` in one call. Work in the PR's worktree (`../glissando-<slug>`) if one
  exists; use `git -C`, never `cd` into the main checkout.
- Read the PR description and any linked ADR first — the review checks the code _against its
  stated intent_.
- **The standard is the files, not this skill**: `CLAUDE.md` (Testing, Working agreement, Code
  rules) and `dev-docs/CODING_PRINCIPLES.md`. If they changed in this PR, the files win. Read
  only the sections the diff touches.

## 1. Docs ↔ implementation

- Every behaviour change updates the matching `dev-docs/` spec section and, when visible to a
  user, the user docs — in this PR. Check the reverse too: no doc describes behaviour the PR
  removed or changed.
- Comments on touched code describe the current state only; no history narration.

## 2. ADRs (`dev-docs/adr/`)

- A real tradeoff decided without an ADR → finding. An ADR for a mechanical change → finding.
- A contradicted existing ADR needs a status update, or the PR changes.
- A shipped ADR's decision matches what the code does. Its number is still free on `main`.

## 3. Implementation quality

Apply `CODING_PRINCIPLES.md` to the diff. The judgement calls beyond a flat rule:

- Small files (split past ~300 lines), names that reveal behaviour, no dead code.
- Comment verbosity: flag comments that narrate, restate the code or duplicate an ADR.
- Error handling fits the call site: context kept when propagated; a fatal error not merely logged.
- Pure logic stays pure; I/O at the edges; no ambient clock/randomness; no ordering races.
- A new dependency carries its justification and an exact, hash-verified pin.

## 4. Tests

- Every new behaviour has a driving test with a behaviour-revealing name; every bug fix a test
  that fails without it; safety rules have their failure paths covered.
- No timing-dependent test; every absence assertion has a positive signal. For a new key case,
  break the behaviour once and confirm it goes red.
- Run the verify target from `CLAUDE.md` § Commands (via a `sonnet` subagent if it is long). A red
  lint or test is a fix-it, not an FYI.

## 5. UI changes

- Mockup approved by the owner before the code? Owner's OK on the built change before the e2e
  case was written? A missing OK is a **blocker**, not something to skip.
- The UI change has a running e2e case asserting what is rendered; case ids unique on the base.
- The PR shows the change as small cropped screenshots.

## 6. CI — fix failures

`gh pr checks <PR>`. All green. If red: read only the failures (the CI-failures script from
`CLAUDE.md` § Commands), fix on the PR branch, verify locally, commit (allowed Conventional Commit
types only), push. Repeat until green. Check once, don't watch-poll.

## 7. Branch freshness

`git fetch origin && git rev-list --count <head>..origin/<base>`. If behind, **merge** the base in
(no rebase, no force-push — the PR is squash-merged anyway) and push. Then re-run sections 1–6: a
clean git merge can still collide semantically (a taken ADR number or case id, shared visual
baselines — regenerate those once with both changes present).

## 8. Verdict

1. **Summary** — what the PR does, one paragraph.
2. **Findings** — per section: ✅ ok / ⚠️ issue (`file:line`) / 🔧 fixed (commit).
3. **Blockers** — what must change before merge that you could not fix (missing owner OK,
   design questions).
4. **Merge readiness** — ready / not ready. **Never merge** — that waits for the owner's go-ahead.

## 9. Post the verdict

After the last push, post the verdict in English, headed `## PR quality review`:
`gh pr comment <PR> --body-file <file>`. If an earlier verdict from this skill exists, replace it
(`gh pr comment --edit-last`) so the PR carries one up-to-date review. No attribution footer.
