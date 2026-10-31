import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { STATE, mountSheet, radios, unmountSheet } from "./testing/settings-sheet-harness";

afterEach(() => unmountSheet());

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

  it("ends with links to the documentation, the source code on GitHub, the licences and self-hosting, each in a new tab", () => {
    const { dialog } = mountSheet();
    const links = [...dialog.querySelectorAll("a")]
      .slice(-4)
      .map(
        (link) =>
          `${link.textContent?.trim()} → ${link.getAttribute("href")} (${link.target}, ${link.rel})`,
      );
    expect(links).toEqual([
      "Dokumentation → https://github.com/polandy/glissando#readme (_blank, noopener noreferrer)",
      "Quellcode auf GitHub → https://github.com/polandy/glissando (_blank, noopener noreferrer)",
      "Open-Source-Lizenzen → third-party-licenses.md (_blank, noopener)",
      "Selbst hosten und Immich → https://github.com/polandy/glissando/blob/main/docs/self-hosting.md (_blank, noopener noreferrer)",
    ]);
  });
});
