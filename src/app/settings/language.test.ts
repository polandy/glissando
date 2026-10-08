import { describe, expect, it } from "vitest";
import { createMemoryStorage } from "../testing/memory-storage";
import {
  createStorageLanguagePreferenceStore,
  resolveLanguage,
  type LanguagePreference,
} from "./language";

const LANGUAGE_KEY = "glissando.language";

describe("language preference store", () => {
  it("follows the browser when nothing is stored", () => {
    const store = createStorageLanguagePreferenceStore(createMemoryStorage());

    expect(store.read()).toBe("auto");
  });

  it.each<LanguagePreference>(["auto", "de", "en"])("reads back a stored %s", (preference) => {
    const store = createStorageLanguagePreferenceStore(createMemoryStorage());
    store.write(preference);

    expect(store.read()).toBe(preference);
  });

  it("keeps the preference under its own key", () => {
    const storage = createMemoryStorage();
    createStorageLanguagePreferenceStore(storage).write("en");

    expect(storage.getItem(LANGUAGE_KEY)).toBe("en");
  });

  it.each(["", "EN", "fr", "de-CH", "null"])(
    "falls back to auto for the invalid value %j",
    (stored) => {
      const store = createStorageLanguagePreferenceStore(
        createMemoryStorage({ [LANGUAGE_KEY]: stored }),
      );

      expect(store.read()).toBe("auto");
    },
  );
});

describe("resolveLanguage", () => {
  it.each<[LanguagePreference, readonly string[], string]>([
    ["auto", ["de-AT", "en"], "de"],
    ["auto", ["fr-FR", "en-US"], "en"],
    ["auto", ["fr-FR"], "en"],
    ["de", ["en-US"], "de"],
    ["en", ["de-DE"], "en"],
  ])("resolves %s with browser languages %j to %s", (preference, browserLanguages, expected) => {
    expect(resolveLanguage(preference, browserLanguages)).toBe(expected);
  });
});
