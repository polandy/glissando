import { describe, expect, it } from "vitest";
import { installOffer, statusBarView, type PwaState, type StatusBarView } from "./status-bar-view";

/** A secure, plain browser tab with nothing to offer. */
const TAB: PwaState = {
  secureContext: true,
  installed: false,
  installPromptAvailable: false,
  installGuide: null,
  hintDismissed: false,
  storageRefused: false,
  updateWaiting: false,
};

const statusCases: readonly {
  readonly rule: string;
  readonly state: Partial<PwaState>;
  readonly status: StatusBarView["status"];
}[] = [
  { rule: "a secure tab is offline and stored", state: {}, status: "offline" },
  {
    rule: "an insecure context is online only",
    state: { secureContext: false },
    status: "insecure",
  },
  {
    rule: "insecure wins over a refused storage",
    state: { secureContext: false, storageRefused: true },
    status: "insecure",
  },
  {
    rule: "a refused storage is not stored permanently",
    state: { storageRefused: true },
    status: "storageRefused",
  },
  { rule: "running installed is installed", state: { installed: true }, status: "installed" },
  {
    rule: "running installed wins over a refused storage",
    state: { installed: true, storageRefused: true },
    status: "installed",
  },
];

const actionCases: readonly {
  readonly rule: string;
  readonly state: Partial<PwaState>;
  readonly action: StatusBarView["action"];
}[] = [
  { rule: "nothing to offer shows no action", state: {}, action: { kind: "none" } },
  {
    rule: "an insecure context explains why",
    state: { secureContext: false },
    action: { kind: "why" },
  },
  {
    rule: "an insecure context offers no installing",
    state: { secureContext: false, installGuide: "ios" },
    action: { kind: "why" },
  },
  {
    rule: "a waiting version offers a reload",
    state: { updateWaiting: true },
    action: { kind: "reload" },
  },
  {
    rule: "a waiting version wins over the install hint",
    state: { updateWaiting: true, installPromptAvailable: true, storageRefused: true },
    action: { kind: "reload" },
  },
  {
    rule: "the browser's install prompt is offered with a hide button",
    state: { installPromptAvailable: true },
    action: { kind: "installPrompt", dismissible: true },
  },
  {
    rule: "the browser's install prompt wins over a guide",
    state: { installPromptAvailable: true, installGuide: "mac-safari" },
    action: { kind: "installPrompt", dismissible: true },
  },
  {
    rule: "a browser without a prompt gets its guide",
    state: { installGuide: "ios" },
    action: { kind: "installGuide", guide: "ios", dismissible: true },
  },
  {
    rule: "a hidden hint stays hidden",
    state: { installGuide: "ios", hintDismissed: true },
    action: { kind: "none" },
  },
  {
    rule: "a refused storage brings a hidden hint back, without a hide button",
    state: { installGuide: "ios", hintDismissed: true, storageRefused: true },
    action: { kind: "installGuide", guide: "ios", dismissible: false },
  },
  {
    rule: "a refused storage shows the prompt without a hide button",
    state: { installPromptAvailable: true, storageRefused: true },
    action: { kind: "installPrompt", dismissible: false },
  },
  {
    rule: "running installed offers no installing",
    state: { installed: true, installPromptAvailable: true, installGuide: "ios" },
    action: { kind: "none" },
  },
];

describe("statusBarView", () => {
  it.each(statusCases)("status: $rule", ({ state, status }) => {
    expect(statusBarView({ ...TAB, ...state }).status).toBe(status);
  });

  it.each(actionCases)("action: $rule", ({ state, action }) => {
    expect(statusBarView({ ...TAB, ...state }).action).toEqual(action);
  });
});

describe("installOffer", () => {
  it("is the browser's prompt where there is one", () => {
    expect(installOffer({ ...TAB, installPromptAvailable: true })).toEqual({
      kind: "installPrompt",
    });
  });

  it("is the guide where the browser has no prompt", () => {
    expect(installOffer({ ...TAB, installGuide: "firefox-android" })).toEqual({
      kind: "installGuide",
      guide: "firefox-android",
    });
  });

  it("ignores a hidden hint", () => {
    expect(installOffer({ ...TAB, installGuide: "ios", hintDismissed: true })).toEqual({
      kind: "installGuide",
      guide: "ios",
    });
  });

  it.each([
    { rule: "insecure", state: { secureContext: false, installGuide: "ios" } },
    { rule: "already installed", state: { installed: true, installPromptAvailable: true } },
    { rule: "without prompt or guide", state: {} },
  ] as const)("is none when $rule", ({ state }) => {
    expect(installOffer({ ...TAB, ...state })).toBeNull();
  });
});
