# Languages

German and English (`i18n/`). The language preference (`settings/language.ts`) is "auto" (the
default: the first browser language the app speaks, English otherwise), "de" or "en", kept in
local storage under `glissando.language`; an unknown stored value counts as "auto". It also sets
`<html lang>` and the locale of the month in a new slideshow's title. All copy lives in
`catalogue-de.ts` (which defines the keys, named `screen.element`) and `catalogue-en.ts` (typed
to the same keys); placeholders `{name}`, plurals `{ one, other }` on `{count}`. Components get
the translator with `getTranslator()` from Svelte context; it reads the translator in effect
(`i18n/translator-state.svelte.ts`) on every call, so a language switch re-renders all copy at
once, without a reload: `t(key, params)`, `formatDuration`
(m:ss), `formatSeconds` ("4,5 s"), `formatDate` (dd.mm.yyyy, UTC).
