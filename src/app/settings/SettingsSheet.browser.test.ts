import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { LanguagePreference } from "./language";
import type { PlaybackQualityPreference } from "./playback-quality";
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
  playbackQuality: "auto",
  browserLanguage: "de",
  effectiveLanguage: "de",
};

const BUILD: BuildInfo = {
  version: "0.0.2",
  commit: "87dd486",
  commitDate: "2026-10-12T16:30:00.000Z",
};

function mountSheet(
  state: SettingsState = STATE,
  { updateWaiting = false, serverOn = false, screenShortEdge = 1280, frameCardShown = true } = {},
) {
  const chosen = {
    themes: [] as ThemePreference[],
    languages: [] as LanguagePreference[],
    qualities: [] as PlaybackQualityPreference[],
    frameCardShown: [] as boolean[],
  };
  let frameSetUps = 0;
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
    serverOn,
    screenShortEdge,
    onPlaybackQuality: (quality: PlaybackQualityPreference) => chosen.qualities.push(quality),
    frameCardShown,
    onSetUpFrame: () => (frameSetUps += 1),
    onFrameCardShown: (shown: boolean) => chosen.frameCardShown.push(shown),
    onClose: () => (closes += 1),
  });
  destroy = mounted.destroy;
  const dialog = document.querySelector("dialog");
  if (dialog === null) {
    throw new Error("the settings sheet is not a dialog");
  }
  return {
    dialog,
    chosen,
    closes: () => closes,
    updates: () => updates,
    frameSetUps: () => frameSetUps,
  };
}

function radios(dialog: HTMLElement, group: string): HTMLElement[] {
  const radiogroup = dialog.querySelector(`[role="radiogroup"][aria-label="${group}"]`);
  return [...(radiogroup?.querySelectorAll<HTMLElement>('[role="radio"]') ?? [])];
}

const QUALITY_GROUP = "Bildqualität von Server-Diashows";

function radioTexts(radios: readonly HTMLElement[]): (string | undefined)[] {
  return radios.map((radio) => radio.textContent?.replace(/\s+/g, " ").trim());
}

const FRAME_SET_UP = "Bilderrahmen einrichten";

function frameSection(dialog: HTMLElement): HTMLElement | null {
  return dialog.querySelector('[aria-label="Bilderrahmen"]');
}

function frameSwitch(dialog: HTMLElement): HTMLInputElement {
  const toggle = frameSection(dialog)?.querySelector<HTMLInputElement>('[role="switch"]');
  if (toggle === null || toggle === undefined) {
    throw new Error("the picture frame section has no switch");
  }
  return toggle;
}

describe("SettingsSheet", () => {
  it("offers the picture frame section only with the server library on", () => {
    const off = mountSheet(STATE, { serverOn: false });
    expect(radios(off.dialog, "Sprache")).toHaveLength(3);
    expect(frameSection(off.dialog)).toBeNull();
    destroy();

    const on = mountSheet(STATE, { serverOn: true });
    expect(frameSection(on.dialog)?.textContent).toContain(FRAME_SET_UP);
  });

  it("opens the frame's set-up screen from the picture frame section", () => {
    const { dialog, frameSetUps } = mountSheet(STATE, { serverOn: true });

    [...(frameSection(dialog)?.querySelectorAll("button") ?? [])]
      .find((button) => button.textContent?.includes(FRAME_SET_UP))
      ?.click();

    expect(frameSetUps()).toBe(1);
  });

  it("says the card is shown above the slideshows while its switch is on", () => {
    const { dialog } = mountSheet(STATE, { serverOn: true, frameCardShown: true });

    expect(frameSwitch(dialog).checked).toBe(true);
    expect(frameSection(dialog)?.textContent).toContain("Steht über deinen Diashows");
  });

  it("says the card is hidden in this browser while its switch is off", () => {
    const { dialog } = mountSheet(STATE, { serverOn: true, frameCardShown: false });

    expect(frameSwitch(dialog).checked).toBe(false);
    expect(frameSection(dialog)?.textContent).toContain("In diesem Browser ausgeblendet");
  });

  it("tells the choice when the card's switch is flipped", () => {
    const { dialog, chosen } = mountSheet(STATE, { serverOn: true, frameCardShown: false });

    frameSwitch(dialog).click();
    flushSync();

    expect(chosen.frameCardShown).toEqual([true]);
  });

  it("offers the quality of server slideshows only with the server library on", () => {
    const off = mountSheet(STATE, { serverOn: false });
    expect(radios(off.dialog, "Sprache")).toHaveLength(3);
    expect(radios(off.dialog, QUALITY_GROUP)).toEqual([]);
    destroy();

    const on = mountSheet(STATE, { serverOn: true });
    expect(radios(on.dialog, QUALITY_GROUP)).toHaveLength(3);
  });

  it("names the quality Automatic picks for this screen and why", () => {
    const { dialog } = mountSheet(STATE, { serverOn: true, screenShortEdge: 1280 });

    expect(radioTexts(radios(dialog, QUALITY_GROUP))).toEqual([
      "Automatisch Zurzeit 1440 · dieser Bildschirm hat 1280 Pixel an der kurzen Kante",
      "1440 Pixel Startet sofort, scharf auf Handy und Laptop",
      "4K Scharf auf großen Bildschirmen; lädt vor dem Start Bilder vor",
    ]);
    expect(radios(dialog, QUALITY_GROUP)[0]?.getAttribute("aria-checked")).toBe("true");
  });

  it("picks 4K automatically on a screen sharper than the preview", () => {
    const { dialog } = mountSheet(STATE, { serverOn: true, screenShortEdge: 2160 });

    expect(radioTexts(radios(dialog, QUALITY_GROUP))[0]).toBe(
      "Automatisch Zurzeit 4K · dieser Bildschirm hat 2160 Pixel an der kurzen Kante",
    );
  });

  it("tells the chosen quality", () => {
    const { dialog, chosen } = mountSheet(STATE, { serverOn: true });

    radios(dialog, QUALITY_GROUP)[2]?.click();
    flushSync();

    expect(chosen.qualities).toEqual(["4k"]);
  });

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
