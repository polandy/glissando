# UX backlog — Copy and terminology

Back to [UX_BACKLOG.md](../UX_BACKLOG.md). Catalogue: `src/app/i18n/catalogue-en*.ts`
(28 files, 1225 keys), German mirrors each key. Copy items need no mockup; the PR shows a
before/after table and updates `docs/user-guide.md` where a term changes.

### UX-16 Mechanics strings that need a component change (size S)

Problem — `editor.transitionHint`, `transitions.hintEffect` and `prepare.preparingLine` still
say how a value is derived ("{share} % of the picture length, at most {max} s"); the picture
editor's transition hint cannot become "Crossfade, 0.6 s" because the component passes neither
the effect name nor the resolved length.

Why — The user needs to know what will happen, not how the app arrives at it.

Proposal — Pass the effect name and the resolved length from the components and reduce each
hint to one outcome sentence.

Done when — No helper string in the picture editor, the transitions sheet or the prepare screen
explains a computation.
