import type { KeyValueStorage } from "../start/first-launch";

/** "system" follows the device's light or dark setting; the others pin a theme. */
export const THEME_PREFERENCES = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";

export interface ThemePreferenceStore {
  read(): ThemePreference;
  write(preference: ThemePreference): void;
}

/** The element whose data-theme attribute tokens.css keys the pinned themes on. */
export type ThemeRoot = Pick<Element, "setAttribute" | "removeAttribute">;

const THEME_KEY = "glissando.theme";
const THEME_ATTRIBUTE = "data-theme";

function isThemePreference(value: string | null): value is ThemePreference {
  return THEME_PREFERENCES.some((preference) => preference === value);
}

export function createStorageThemePreferenceStore(storage: KeyValueStorage): ThemePreferenceStore {
  return {
    // A stored value this version does not know falls back to the device's theme.
    read: () => {
      const stored = storage.getItem(THEME_KEY);
      return isThemePreference(stored) ? stored : DEFAULT_THEME_PREFERENCE;
    },
    write: (preference) => storage.setItem(THEME_KEY, preference),
  };
}

export function applyThemePreference(root: ThemeRoot, preference: ThemePreference): void {
  if (preference === "system") {
    root.removeAttribute(THEME_ATTRIBUTE);
  } else {
    root.setAttribute(THEME_ATTRIBUTE, preference);
  }
}
