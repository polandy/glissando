import { describe, expect, it } from "vitest";
import { createMemoryStorage } from "../testing/memory-storage";
import {
  applyThemePreference,
  createStorageThemePreferenceStore,
  type ThemePreference,
  type ThemeRoot,
} from "./theme";

const THEME_KEY = "glissando.theme";

function createFakeRoot(): ThemeRoot & { attributes: Map<string, string> } {
  const attributes = new Map<string, string>();
  return {
    attributes,
    setAttribute: (name, value) => void attributes.set(name, value),
    removeAttribute: (name) => void attributes.delete(name),
  };
}

describe("theme preference store", () => {
  it("follows the system when nothing is stored", () => {
    const store = createStorageThemePreferenceStore(createMemoryStorage());

    expect(store.read()).toBe("system");
  });

  it.each<ThemePreference>(["system", "light", "dark"])("reads back a stored %s", (preference) => {
    const store = createStorageThemePreferenceStore(createMemoryStorage());
    store.write(preference);

    expect(store.read()).toBe(preference);
  });

  it.each(["", "Dark", "sepia", "null"])(
    "falls back to system for the invalid value %j",
    (stored) => {
      const store = createStorageThemePreferenceStore(createMemoryStorage({ [THEME_KEY]: stored }));

      expect(store.read()).toBe("system");
    },
  );
});

describe("applyThemePreference", () => {
  it.each<[ThemePreference, string]>([
    ["light", "light"],
    ["dark", "dark"],
  ])("pins the %s theme on the root", (preference, attribute) => {
    const root = createFakeRoot();

    applyThemePreference(root, preference);

    expect(root.attributes.get("data-theme")).toBe(attribute);
  });

  it("lets the device decide by removing a pinned theme", () => {
    const root = createFakeRoot();
    applyThemePreference(root, "dark");
    expect(root.attributes.get("data-theme")).toBe("dark");

    applyThemePreference(root, "system");

    expect(root.attributes.has("data-theme")).toBe(false);
  });
});
