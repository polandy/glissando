import type { LanguagePreference } from "../language";
import type { PlaybackQualityPreference } from "../playback-quality";
import type { ThemePreference } from "../theme";
import type { SettingsState } from "../app-settings";
import type { BuildInfo } from "../build-info";
import { mountWithTranslator } from "../../testing/mount-with-translator";
import SettingsSheet from "../SettingsSheet.svelte";

let destroy = () => {};

/** Unmounts the sheet the last `mountSheet` mounted. */
export function unmountSheet(): void {
  destroy();
}

export const STATE: SettingsState = {
  theme: "system",
  language: "auto",
  playbackQuality: "auto",
  browserLanguage: "de",
  effectiveLanguage: "de",
};

export const BUILD: BuildInfo = {
  version: "0.0.2",
  commit: "87dd486",
  commitDate: "2026-10-12T16:30:00.000Z",
};

export function mountSheet(
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

export function radios(dialog: HTMLElement, group: string): HTMLElement[] {
  const radiogroup = dialog.querySelector(`[role="radiogroup"][aria-label="${group}"]`);
  return [...(radiogroup?.querySelectorAll<HTMLElement>('[role="radio"]') ?? [])];
}

export const QUALITY_GROUP = "Bildqualität von Server-Diashows";

export function radioTexts(radios: readonly HTMLElement[]): (string | undefined)[] {
  return radios.map((radio) => radio.textContent?.replace(/\s+/g, " ").trim());
}

export function groupTitles(dialog: HTMLElement): (string | undefined)[] {
  return [...dialog.querySelectorAll(".eyebrow")].map((node) => node.textContent?.trim());
}

export const FRAME_SET_UP = "Bilderrahmen einrichten";

export function frameSection(dialog: HTMLElement): HTMLElement | null {
  return dialog.querySelector('[aria-label="Bilderrahmen"]');
}

export function frameSwitch(dialog: HTMLElement): HTMLInputElement {
  const toggle = frameSection(dialog)?.querySelector<HTMLInputElement>('[role="switch"]');
  if (toggle === null || toggle === undefined) {
    throw new Error("the picture frame section has no switch");
  }
  return toggle;
}
