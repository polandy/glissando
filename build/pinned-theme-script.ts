import type { Plugin } from "vite";
import {
  DEFAULT_THEME_PREFERENCE,
  THEME_ATTRIBUTE,
  THEME_KEY,
  THEME_PREFERENCES,
} from "../src/app/settings/theme.ts";

const PINNED_THEMES = THEME_PREFERENCES.filter((theme) => theme !== DEFAULT_THEME_PREFERENCE);

/**
 * An inline script for index.html's head that puts a pinned theme on `<html>` before the first
 * paint, so the app shell already shows it; `main.ts` keeps it in sync from then on.
 */
export function pinnedThemeScript(): string {
  return [
    `var theme = localStorage.getItem(${JSON.stringify(THEME_KEY)});`,
    `if (${JSON.stringify(PINNED_THEMES)}.indexOf(theme) >= 0) {`,
    `  document.documentElement.setAttribute(${JSON.stringify(THEME_ATTRIBUTE)}, theme);`,
    `}`,
  ].join("\n");
}

/** Puts `pinnedThemeScript` first into index.html's head, in the dev server and the build. */
export function pinnedThemePlugin(): Plugin {
  return {
    name: "glissando:pinned-theme",
    transformIndexHtml: () => [{ tag: "script", children: pinnedThemeScript(), injectTo: "head" }],
  };
}
