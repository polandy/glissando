import type { InstallGuide } from "../../pwa/install-guide";
import type { MessageKey, MessageParams, ParamValue } from "../i18n/messages";
import type { IconName } from "../icons";

/** The messages with a `{key}` placeholder. */
type StepTextKey = {
  [Key in MessageKey]: MessageParams<Key> extends { readonly key: ParamValue } ? Key : never;
}[MessageKey];

/** A step's text, with `{key}` where the browser's button or menu item appears as a chip. */
export interface InstallStep {
  readonly text: StepTextKey;
  readonly key: { readonly label: MessageKey; readonly icon?: IconName };
}

export interface InstallSteps {
  readonly title: MessageKey;
  readonly steps: readonly InstallStep[];
  /** Paragraphs after the steps. */
  readonly after: readonly MessageKey[];
}

/** The steps of each browser without an install prompt (dev-docs/APP.md, Installing and offline). */
export const INSTALL_STEPS: Readonly<Record<InstallGuide, InstallSteps>> = {
  ios: {
    title: "pwa.guideTitle",
    steps: [
      { text: "pwa.ios.step1", key: { label: "pwa.ios.share", icon: "share" } },
      { text: "pwa.ios.step2", key: { label: "pwa.ios.addToHome", icon: "addToHome" } },
      { text: "pwa.ios.step3", key: { label: "pwa.ios.add" } },
    ],
    after: ["pwa.ios.after"],
  },
  "mac-safari": {
    title: "pwa.guideTitle",
    steps: [
      { text: "pwa.macSafari.step1", key: { label: "pwa.macSafari.file" } },
      { text: "pwa.macSafari.step2", key: { label: "pwa.macSafari.addToDock" } },
      { text: "pwa.macSafari.step3", key: { label: "pwa.macSafari.add" } },
    ],
    after: ["pwa.macSafari.after"],
  },
  "firefox-android": {
    title: "pwa.guideTitle",
    steps: [
      {
        text: "pwa.firefoxAndroid.step1",
        key: { label: "pwa.firefoxAndroid.menu", icon: "menuDots" },
      },
      {
        text: "pwa.firefoxAndroid.step2",
        key: { label: "pwa.firefoxAndroid.addToHome", icon: "addToHome" },
      },
      { text: "pwa.firefoxAndroid.step3", key: { label: "pwa.firefoxAndroid.add" } },
    ],
    after: ["pwa.firefoxAndroid.after"],
  },
  "firefox-desktop": {
    title: "pwa.firefoxDesktop.title",
    steps: [],
    after: ["pwa.firefoxDesktop.text", "pwa.firefoxDesktop.note"],
  },
};
