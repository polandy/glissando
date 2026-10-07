Identify the next task to work on:

1. Check what is already in flight first: `gh pr list` and `git worktree list`. This session's
   open PR waiting on a merge go-ahead _is_ the next task (one open feature PR per session).
2. Sources of open work, in order:
   - whatever the owner has just asked for
   - `TODO.md` in the repo root, **HIGH** first
   - an open review worklist in the repo root (`*REVIEW*.md`, untracked by convention)
3. Read ONLY the doc sections that item references, not the full documents.
4. Propose a concrete plan with small, committable steps — max 5. Each step is one Conventional
   Commit with green tests. A UI item starts with an interactive mockup, not code.
