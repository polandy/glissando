import { afterEach, describe, expect, it } from "vitest";
import { FocusPass } from "../../library/focus-pass";
import { FakeFocusDetector } from "../../library/testing/fake-focus-detector";
import { whenRendered } from "../testing/when-rendered";
import { mountRoute, storeWithShow, unmountRoute } from "./slideshow-route-harness";

/** Engines set the tile a few pixels apart. */
const TILE_HEIGHT_TOLERANCE = 24;

afterEach(() => unmountRoute());

/** A store whose slideshow stays pending until `release` is called. */
async function delayedStore() {
  const store = await storeWithShow();
  let release = () => {};
  const loaded = new Promise<void>((resolve) => (release = resolve));
  const get = store.getSlideshow.bind(store);
  store.getSlideshow = async (id) => {
    await loaded;
    return get(id);
  };
  return { store, release };
}

/** The element, or a failing test instead of a null dereference. */
function present<T extends Element>(element: T | null | undefined, what: string): T {
  if (element == null) {
    throw new Error(`${what} is missing`);
  }
  return element;
}

describe("the slideshow route while the slideshow loads", () => {
  it("shows a skeleton strip and a status, then the strip in the same place", async () => {
    const { store, release } = await delayedStore();
    const focusPass = new FocusPass({
      store,
      detector: new FakeFocusDetector(() => ({ kind: "none" })),
      log: () => {},
      reportError: () => {},
    });
    const { target } = mountRoute(store, focusPass, null);

    expect(target.querySelector('[role="status"]')?.textContent).toBe("Lädt …");
    const skeleton = present(target.querySelector<HTMLElement>("ul.skeleton"), "skeleton");
    expect(skeleton.children.length).toBeGreaterThan(0);
    const before = skeleton.getBoundingClientRect();
    const blockHeight = present(
      skeleton.firstElementChild,
      "skeleton block",
    ).getBoundingClientRect().height;

    release();
    const strip = (await whenRendered(target, "ol.strip")) as HTMLElement;

    expect(target.querySelector("ul.skeleton")).toBeNull();
    expect(target.querySelector('[role="status"]')).toBeNull();
    const tile = present(strip.firstElementChild, "strip tile").getBoundingClientRect();
    expect(Math.abs(tile.height - blockHeight)).toBeLessThanOrEqual(TILE_HEIGHT_TOLERANCE);
    // Only the screen's header and the strip's heading arrive above the strip.
    expect(strip.getBoundingClientRect().top - before.top).toBeLessThanOrEqual(
      target.getBoundingClientRect().height,
    );
  });
});
