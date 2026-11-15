Review uncommitted or recently committed changes against project standards:

1. `git diff HEAD` (or `git diff HEAD~1` if the working tree is clean).
2. Read `docs/dev/CODING_PRINCIPLES.md` and `CLAUDE.md`'s **Testing**, **Working agreement** and
   **Code rules**. **Those files are the standard** — check the diff against them rather than a
   list restated here.
3. Beyond them, check:
   - a driving test per new behaviour, whose _name_ says which rule would break; no racing test
   - every spec section the diff changes names its e2e case, or why unit is the right layer; e2e
     cases still asserting changed behaviour updated; a new e2e case cites its spec section
   - comments say _why_ and describe the current state only
   - no security issues (OWASP top 10)
   - docs updated in the same change; `TODO.md` line deleted if the change closes it
   - Conventional Commits, English, no attribution lines
4. Report concisely: what's good, what needs fixing. If clean, say so briefly.
