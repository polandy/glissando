import { describe, expect, it } from "vitest";
import { createMemoryStorage } from "../testing/memory-storage";
import { AppSettings, type SettingsState } from "./app-settings";
import { createStorageLanguagePreferenceStore } from "./language";
import { createStorageThemePreferenceStore } from "./theme";

function createSettings(stored: Record<string, string> = {}, browserLanguages = ["de-DE"]) {
  const storage = createMemoryStorage(stored);
  const settings = new AppSettings({
    themes: createStorageThemePreferenceStore(storage),
    languages: createStorageLanguagePreferenceStore(storage),
    browserLanguages,
  });
  return { settings, storage };
}

describe("AppSettings", () => {
  it("starts from the stored preferences", () => {
    const { settings } = createSettings({ "glissando.theme": "dark", "glissando.language": "en" });

    expect(settings.state).toEqual<SettingsState>({
      theme: "dark",
      language: "en",
      browserLanguage: "de",
      effectiveLanguage: "en",
    });
  });

  it("speaks the browser's language while the preference is auto", () => {
    const { settings } = createSettings({}, ["fr-FR", "de"]);

    expect(settings.state.language).toBe("auto");
    expect(settings.state.effectiveLanguage).toBe("de");
  });

  it("tells a new subscriber the current state at once", () => {
    const { settings } = createSettings({ "glissando.theme": "light" });
    const seen: SettingsState[] = [];

    settings.subscribe((state) => seen.push(state));

    expect(seen).toEqual([settings.state]);
    expect(seen[0]?.theme).toBe("light");
  });

  it("stores a chosen theme and tells its subscribers", () => {
    const { settings, storage } = createSettings();
    const seen: SettingsState[] = [];
    settings.subscribe((state) => seen.push(state));

    settings.setTheme("dark");

    expect(seen.map((state) => state.theme)).toEqual(["system", "dark"]);
    expect(storage.getItem("glissando.theme")).toBe("dark");
  });

  it("stores a chosen language and switches the language in effect", () => {
    const { settings, storage } = createSettings({}, ["de-DE"]);
    const seen: SettingsState[] = [];
    settings.subscribe((state) => seen.push(state));

    settings.setLanguage("en");

    expect(seen.map((state) => state.effectiveLanguage)).toEqual(["de", "en"]);
    expect(storage.getItem("glissando.language")).toBe("en");
  });

  it("does not tell subscribers about a choice that changes nothing", () => {
    const { settings } = createSettings({ "glissando.language": "de" });
    const seen: SettingsState[] = [];
    settings.subscribe((state) => seen.push(state));

    settings.setLanguage("de");
    settings.setTheme("dark");

    expect(seen.map((state) => state.theme)).toEqual(["system", "dark"]);
  });

  it("stops telling a subscriber once it unsubscribed", () => {
    const { settings } = createSettings();
    const seen: SettingsState[] = [];
    const stop = settings.subscribe((state) => seen.push(state));

    stop();
    settings.setTheme("light");

    expect(seen).toHaveLength(1);
    expect(settings.state.theme).toBe("light");
  });
});
