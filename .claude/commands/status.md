Run a quick project health check and report concisely:

1. The fast unit-test command named in `CLAUDE.md` § Commands (skip if none is defined yet).
2. `git log --oneline -5`, `git status -s`, `gh pr list` and `git worktree list` in one call.

Format as a short status dashboard. Flag anything that needs attention (failing tests,
uncommitted work, an open PR waiting on a merge go-ahead, a stale worktree).
