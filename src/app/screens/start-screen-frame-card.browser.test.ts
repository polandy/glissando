import { createRawSnippet } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { createTranslator } from "../i18n/translator";
import { mountWithTranslator } from "../testing/mount-with-translator";
import StartScreen from "./StartScreen.svelte";

let destroy = () => {};
afterEach(() => destroy());

function mountStart({ serverOn, frameCardShown }: { serverOn: boolean; frameCardShown: boolean }) {
  let hides = 0;
  const mounted = mountWithTranslator(
    StartScreen,
    {
      slideshows: [],
      focusSearches: new Map(),
      onCreate: () => {},
      onOpen: () => {},
      onSettings: () => {},
      onOpenFile: () => {},
      notice: null,
      onDismissNotice: () => {},
      onReload: () => {},
      onSetUpFrame: () => {},
      onHideFrameCard: () => (hides += 1),
      serverOn,
      frameCardShown,
      updateWaiting: false,
      statusBar: createRawSnippet(() => ({ render: () => "<footer></footer>" })),
    },
    { current: createTranslator("en") },
  );
  destroy = mounted.destroy;
  return { target: mounted.target, hides: () => hides };
}

const hasFrameCard = (target: HTMLElement) => target.querySelector(".frame-card") !== null;
const hasHero = (target: HTMLElement) => target.querySelector(".hero") !== null;

describe("StartScreen picture frame card", () => {
  it("shows the card while the server is on and the card is not hidden", () => {
    const { target } = mountStart({ serverOn: true, frameCardShown: true });

    expect(hasFrameCard(target)).toBe(true);
  });

  it("leaves the card out once it is hidden, with the rest of the screen still there", () => {
    const { target } = mountStart({ serverOn: true, frameCardShown: false });

    expect(hasHero(target)).toBe(true);
    expect(hasFrameCard(target)).toBe(false);
  });

  it("leaves the card out while the server is off, however the choice stands", () => {
    const { target } = mountStart({ serverOn: false, frameCardShown: true });

    expect(hasHero(target)).toBe(true);
    expect(hasFrameCard(target)).toBe(false);
  });

  it("asks to hide the card when its close button is pressed", () => {
    const { target, hides } = mountStart({ serverOn: true, frameCardShown: true });

    target
      .querySelector<HTMLButtonElement>(
        '.frame-card button[aria-label="Hide the picture frame card"]',
      )
      ?.click();

    expect(hides()).toBe(1);
  });
});
