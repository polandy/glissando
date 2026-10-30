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
    serverFocusSearches: new Map(),
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

const demoCard = (target: HTMLElement): HTMLButtonElement | null =>
  target.querySelector<HTMLButtonElement>(".hero .demo-card");

describe("StartScreen's demo slideshow card", () => {
  it("stays out of the hero when the demo is not offered", () => {
    const target = mountStart();

    expect(demoCard(target)).toBeNull();
  });

  it("offers the demo, idle and online, with the action as its accessible name, and starts it on click", () => {
    let starts = 0;
    const target = mountStart({
      visible: true,
      state: { kind: "idle", online: true },
      onLoad: () => (starts += 1),
    });

    const card = demoCard(target);
    expect(card?.getAttribute("aria-label")).toBe("Demo-Slideshow laden");
    expect(card?.textContent).toContain("Glissando in Aktion sehen");
    expect(card?.textContent).toContain("Demo-Slideshow laden");
    expect(card?.disabled).toBe(false);

    card?.click();

    expect(starts).toBe(1);
  });

  it("disables the card and shows a hairline while loading, with progress as its name", () => {
    const target = mountStart({
      visible: true,
      state: { kind: "loading", online: true, received: 12_000_000, total: 31_000_000 },
      onLoad: () => {},
    });

    const card = demoCard(target);
    expect(card?.disabled).toBe(true);
    expect(card?.getAttribute("aria-label")).toContain("12 von 31");
    expect(card?.textContent).toContain("12 von 31");
    expect(target.querySelector(".hero .meter")).not.toBeNull();
  });

  it("disables the card and hints at a connection while offline", () => {
    const target = mountStart({
      visible: true,
      state: { kind: "idle", online: false },
      onLoad: () => {},
    });

    const card = demoCard(target);
    expect(card?.disabled).toBe(true);
    expect(card?.textContent).toContain("Braucht eine Verbindung");
  });
});
