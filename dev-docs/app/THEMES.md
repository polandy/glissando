# Themes

Light and dark, both from the tokens in `src/styles/tokens.css` (palette in
[BRAND.md](../BRAND.md)). The theme preference (`settings/theme.ts`) is "system" (the default:
follow the device's `prefers-color-scheme`), "light" or "dark". It is kept in the browser's local
storage under `glissando.theme`; an unknown stored value counts as "system". An inline script in
`index.html`'s head (`build/pinned-theme-script.ts`) applies it before the first paint, so the app
shell already shows a pinned theme; `main.ts` keeps it applied from then on: "light" or "dark"
sets `data-theme` on `<html>`, "system" removes it. The settings sheet sets it.
