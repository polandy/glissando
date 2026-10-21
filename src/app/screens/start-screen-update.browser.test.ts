import { createRawSnippet } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { mountWithTranslator } from "../testing/mount-with-translator";
import StartScreen from "./StartScreen.svelte";

let destroy = () => {};
afterEach(() => destroy());

function gear(updateWaiting: boolean): HTMLButtonElement {
  const mounted = mountWithTranslator(StartScreen, {
    slideshows: [],
    focusSearches: new Map(),
    serverFocusSearches: new Map(),
    updateWaiting,
    onCreate: () => {},
    onOpen: () => {},
    onSettings: () => {},
    onOpenFile: () => {},
    notice: null,
    onDismissNotice: () => {},
    onReload: () => {},
    onSetUpFrame: () => {},
    onHideFrameCard: () => {},
    statusBar: createRawSnippet(() => ({ render: () => "<footer></footer>" })),
  });
  destroy = mounted.destroy;
  const button = mounted.target.querySelector<HTMLButtonElement>("button.gear");
  if (button === null) {
    throw new Error("the start screen has no gear");
  }
  return button;
}

describe("StartScreen's gear while a new version waits", () => {
  it("is plain settings without a waiting version", () => {
    const button = gear(false);
    expect(button.getAttribute("aria-label")).toBe("Einstellungen");
    expect(button.querySelector(".badge")).toBeNull();
  });

  it("carries a dot and says a new version is ready", () => {
    const button = gear(true);
    expect(button.getAttribute("aria-label")).toBe("Einstellungen · neue Version bereit");
    expect(button.querySelector(".badge")).not.toBeNull();
  });
});
