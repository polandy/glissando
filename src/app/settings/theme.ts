import type { KeyValueStorage } from "../start/first-launch";
import { createStoredChoice, type StoredChoice } from "./stored-choice";

/** "system" follows the device's light or dark setting; the others pin a theme. */
export const THEME_PREFERENCES = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";

export type ThemePreferenceStore = StoredChoice<ThemePreference>;

/** The element whose data-theme attribute tokens.css keys the pinned themes on. */
export type ThemeRoot = Pick<Element, "setAttribute" | "removeAttribute">;

const THEME_KEY = "glissando.theme";
const THEME_ATTRIBUTE = "data-theme";

export function createStorageThemePreferenceStore(storage: KeyValueStorage): ThemePreferenceStore {
  return createStoredChoice(storage, THEME_KEY, THEME_PREFERENCES, DEFAULT_THEME_PREFERENCE);
}

export function applyThemePreference(root: ThemeRoot, preference: ThemePreference): void {
  if (preference === "system") {
    root.removeAttribute(THEME_ATTRIBUTE);
  } else {
    root.setAttribute(THEME_ATTRIBUTE, preference);
  }
}
