import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { LanguagePreference } from "./language";
import type { ThemePreference } from "./theme";
import type { SettingsState } from "./app-settings";
import type { BuildInfo } from "./build-info";
import { mountWithTranslator } from "../testing/mount-with-translator";
import SettingsSheet from "./SettingsSheet.svelte";

let destroy = () => {};
afterEach(() => destroy());

const STATE: SettingsState = {
  theme: "system",
  language: "auto",
  browserLanguage: "de",
  effectiveLanguage: "de",
};

const BUILD: BuildInfo = {
  version: "0.0.2",
  commit: "87dd486",
  commitDate: "2026-10-12T16:30:00.000Z",
};

function mountSheet(state: SettingsState = STATE, { updateWaiting = false } = {}) {
  const chosen = { themes: [] as ThemePreference[], languages: [] as LanguagePreference[] };
  let closes = 0;
  let updates = 0;
  const mounted = mountWithTranslator(SettingsSheet, {
    state,
    build: BUILD,
    updateWaiting,
    onUpdate: () => (updates += 1),
    immich: { kind: "notSetUp" },
    onCheckImmich: () => undefined,
    onReload: () => undefined,
    onTheme: (theme: ThemePreference) => chosen.themes.push(theme),
    onLanguage: (language: LanguagePreference) => chosen.languages.push(language),
    onClose: () => (closes += 1),
  });
  destroy = mounted.destroy;
  const dialog = document.querySelector("dialog");
  if (dialog === null) {
    throw new Error("the settings sheet is not a dialog");
  }
  return { dialog, chosen, closes: () => closes, updates: () => updates };
}

function radios(dialog: HTMLElement, group: string): HTMLElement[] {
  const radiogroup = dialog.querySelector(`[role="radiogroup"][aria-label="${group}"]`);
  return [...(radiogroup?.querySelectorAll<HTMLElement>('[role="radio"]') ?? [])];
}

describe("SettingsSheet", () => {
  it("offers the theme and the language as radio groups with the current choice checked", () => {
    const { dialog } = mountSheet();

    const themes = radios(dialog, "Erscheinungsbild");
    const languages = radios(dialog, "Sprache");

    expect(dialog.open).toBe(true);
    expect(themes.map((radio) => radio.textContent?.replace(/\s+/g, " ").trim())).toEqual([
      "Wie das Gerät Hell oder dunkel, je nach Systemeinstellung",
      "Hell",
      "Dunkel",
    ]);
    expect(themes.map((radio) => radio.getAttribute("aria-checked"))).toEqual([
      "true",
      "false",
      "false",
    ]);
    expect(languages.map((radio) => radio.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);
    const hintId = themes[0]?.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(hintId)?.textContent).toBe(
      "Hell oder dunkel, je nach Systemeinstellung",
    );
  });

  it("names the language the browser picks under 'Same as browser'", () => {
    const { dialog } = mountSheet({ ...STATE, browserLanguage: "en" });

    expect(radios(dialog, "Sprache")[0]?.textContent).toContain("Zurzeit Englisch");
  });

  it("chooses an option by click", () => {
    const { dialog, chosen } = mountSheet();

    radios(dialog, "Erscheinungsbild")[2]?.click();

    expect(chosen.themes).toEqual(["dark"]);
  });

  it("moves the choice and the focus with the arrow keys", () => {
    const { dialog, chosen } = mountSheet({ ...STATE, language: "de" });
    const languages = radios(dialog, "Sprache");

    languages[1]?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    flushSync();

    expect(chosen.languages).toEqual(["en"]);
    expect(document.activeElement).toBe(languages[2]);
  });

  it("closes with the close button and with Escape", () => {
    const { dialog, closes } = mountSheet();

    dialog.querySelector<HTMLButtonElement>('button[aria-label="Schließen"]')?.click();
    dialog.dispatchEvent(new Event("cancel", { cancelable: true }));

    expect(closes()).toBe(2);
    expect(dialog.open).toBe(true);
  });

  it("closes on a tap on the scrim around the sheet", () => {
    const { dialog, closes } = mountSheet();

    radios(dialog, "Sprache")[0]?.click();
    dialog.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(closes()).toBe(1);
  });

  it("names the running build: version, commit and the commit's date", () => {
    const { dialog } = mountSheet();
    const version = dialog.querySelector('[aria-labelledby="settings-version"]');
    expect(version?.textContent?.replace(/\s+/g, " ").trim()).toBe(
      "Version Glissando 0.0.2 87dd486 · 12.10.2026",
    );
  });

  it("offers no update at the version while none waits", () => {
    const { dialog } = mountSheet();
    expect(dialog.textContent).toContain("Glissando 0.0.2");
    expect([...dialog.querySelectorAll("button")].map((b) => b.textContent?.trim())).not.toContain(
      "Neu laden zum Aktualisieren",
    );
  });

  it("offers the update at the version while a new version waits", () => {
    const { dialog, updates } = mountSheet(STATE, { updateWaiting: true });
    const button = [...dialog.querySelectorAll("button")].find(
      (candidate) => candidate.textContent?.trim() === "Neu laden zum Aktualisieren",
    );
    button?.click();
    expect(updates()).toBe(1);
  });
});
