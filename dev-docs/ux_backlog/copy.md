# UX backlog — Copy and terminology

Back to [UX_BACKLOG.md](../UX_BACKLOG.md). Catalogue: `src/app/i18n/catalogue-en*.ts`
(28 files, 1225 keys), German mirrors each key. Copy items need no mockup; the PR shows a
before/after table and updates `docs/user-guide.md` where a term changes.

### UX-17 Raw error text reaches the user (size S)

Problem — `VideoExportSheet.svelte:151` and `HtmlExportSheet.svelte:125` render
`view.error.message` verbatim; the standalone file page shows "glissando.json can't be read:
{reason}" with the parser's reason.

Why — "Errors sit at their cause, in user language, with a way out."

Proposal — Map known failure classes (storage full, clip unsupported, browser unsupported,
cancelled, unknown) to user sentences with an action (Try again, Choose a smaller size); log
the raw message to the console only. The file page: "This file is damaged. Try the original
file again." plus a "Show details" fold for the reason.

Done when — No component renders an `Error.message` directly (grep test in `npm run verify`
or a unit test on the mapping); each failure class has a string and an action.
