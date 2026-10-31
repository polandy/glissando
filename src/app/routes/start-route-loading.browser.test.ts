import { createRawSnippet } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { FocusPass } from "../../library/focus-pass";
import { FakeFocusDetector } from "../../library/testing/fake-focus-detector";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { whenRendered } from "../testing/when-rendered";
import { mountWithTranslator } from "../testing/mount-with-translator";
import StartRoute from "./StartRoute.svelte";
import { storeWithShow } from "./slideshow-route-harness";

/** Engines set the card text a few pixels apart. */
const CARD_HEIGHT_TOLERANCE = 16;
/** The space between the heading and the cards. */
const GAP = 24;
let destroy = () => {};
afterEach(() => destroy());

/** A store whose slideshow list stays pending until `release` is called. */
async function delayedStore() {
  const store = await storeWithShow();
  let release = () => {};
  const loaded = new Promise<void>((resolve) => (release = resolve));
  const list = store.listSlideshows.bind(store);
  store.listSlideshows = async () => {
    await loaded;
    return list();
  };
  return { store, release };
}

function mountStart(store: MemoryLibraryStore) {
  const pass = new FocusPass({
    store,
    detector: new FakeFocusDetector(() => ({ kind: "none" })),
    log: () => {},
    reportError: () => {},
  });
  const mounted = mountWithTranslator(StartRoute, {
    store,
    serverLibrary: {
      availability: { subscribe: () => () => {} },
      store: {},
      memory: {},
    } as never,
    focusPass: pass,
    serverFocusPass: pass,
    playStartAnimation: false,
    onError: (error: unknown) => {
      throw error;
    },
    onCreate: () => {},
    onOpen: () => {},
    updateWaiting: false,
    onSettings: () => {},
    onOpenFile: () => {},
    notice: null,
    onDismissNotice: () => {},
    onReload: () => {},
    statusBar: createRawSnippet(() => ({ render: () => "<footer></footer>" })),
    serverOn: false,
    onSetUpFrame: () => {},
    onHideFrameCard: () => {},
    frameCardShown: false,
  });
  destroy = mounted.destroy;
  return mounted.target;
}

/** The element, or a failing test instead of a null dereference. */
function present<T extends Element>(element: T | null | undefined, what: string): T {
  if (element == null) {
    throw new Error(`${what} is missing`);
  }
  return element;
}

describe("the start route while the slideshows load", () => {
  it("shows three skeleton cards with a busy label, then the cards in the same place", async () => {
    const { store, release } = await delayedStore();
    const target = mountStart(store);

    expect(target.querySelector('[aria-busy="true"]')?.getAttribute("aria-label")).toBe("Lädt …");
    const skeleton = present(target.querySelector<HTMLElement>("ul.skeleton"), "skeleton");
    expect(skeleton.children).toHaveLength(3);
    const before = skeleton.getBoundingClientRect();
    const blockHeight = present(skeleton.firstElementChild, "skeleton card").getBoundingClientRect()
      .height;

    release();
    const grid = (await whenRendered(target, "ul.grid")) as HTMLElement;

    expect(target.querySelector("ul.skeleton")).toBeNull();
    expect(target.querySelector('[aria-busy="true"]')).toBeNull();
    // Only the header and the section heading arrive above the cards.
    const head = present(
      target.querySelector<HTMLElement>(".head"),
      "heading",
    ).getBoundingClientRect();
    expect(grid.getBoundingClientRect().top - before.top).toBeLessThanOrEqual(
      head.bottom - before.top + GAP,
    );
    const cardHeight = present(grid.firstElementChild, "first card").getBoundingClientRect().height;
    expect(Math.abs(cardHeight - blockHeight)).toBeLessThanOrEqual(CARD_HEIGHT_TOLERANCE);
  });
});
