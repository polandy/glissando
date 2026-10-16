import { createRawSnippet } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { DemoSlideshowState } from "../start/demo-slideshow-flow";
import { mountWithTranslator } from "../testing/mount-with-translator";
import StartScreen from "./StartScreen.svelte";

let destroy = () => {};
afterEach(() => destroy());

function mountStart(demo?: { visible: boolean; state: DemoSlideshowState; onLoad: () => void }) {
  const mounted = mountWithTranslator(StartScreen, {
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
    onHideFrameCard: () => {},
    updateWaiting: false,
    statusBar: createRawSnippet(() => ({ render: () => "<footer></footer>" })),
    ...(demo === undefined ? {} : { demo }),
  });
  destroy = mounted.destroy;
  return mounted.target;
}

const demoButton = (target: HTMLElement): HTMLButtonElement | undefined =>
  [...target.querySelectorAll<HTMLButtonElement>(".hero button")].find((button) =>
    button.textContent?.includes("Demo"),
  );

describe("StartScreen's demo slideshow button", () => {
  it("stays out of the hero when the demo is not offered", () => {
    const target = mountStart();

    expect(demoButton(target)).toBeUndefined();
  });

  it("offers the demo, idle and online, and starts it on click", () => {
    let starts = 0;
    const target = mountStart({
      visible: true,
      state: { kind: "idle", online: true },
      onLoad: () => (starts += 1),
    });

    const button = demoButton(target);
    expect(button?.textContent).toContain("Demo-Slideshow laden");
    expect(button?.disabled).toBe(false);

    button?.click();

    expect(starts).toBe(1);
  });

  it("disables the button and shows a hairline while loading", () => {
    const target = mountStart({
      visible: true,
      state: { kind: "loading", online: true, received: 12_000_000, total: 31_000_000 },
      onLoad: () => {},
    });

    const button = demoButton(target);
    expect(button?.disabled).toBe(true);
    expect(button?.textContent).toContain("12 von 31");
    expect(target.querySelector(".hero .meter")).not.toBeNull();
  });

  it("disables the button and hints at a connection while offline", () => {
    const target = mountStart({
      visible: true,
      state: { kind: "idle", online: false },
      onLoad: () => {},
    });

    const button = demoButton(target);
    expect(button?.disabled).toBe(true);
    expect(target.querySelector(".hero")?.textContent).toContain("Braucht eine Verbindung");
  });
});
