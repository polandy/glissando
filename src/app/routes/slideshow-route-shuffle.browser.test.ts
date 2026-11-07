import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { FocusPass } from "../../library/focus-pass";
import { FakeFocusDetector } from "../../library/testing/fake-focus-detector";
import { whenRendered } from "../testing/when-rendered";
import { mountRoute, storeWithShow, unmountRoute } from "./slideshow-route-harness";

afterEach(() => unmountRoute());

describe("the slideshow route, shuffling", () => {
  it("draws the new order from the random it was given", async () => {
    const store = await storeWithShow();
    // Never started: the pass stays idle and finds nothing.
    const focusPass = new FocusPass({
      store,
      detector: new FakeFocusDetector(() => ({ kind: "none" })),
      log: () => {},
      reportError: () => {},
    });
    const { target, randomDraws } = mountRoute(store, focusPass, null);
    await whenRendered(target, ".strip .pick");
    const shuffle = target.querySelector<HTMLButtonElement>('button[aria-label="Mischen"]');
    expect(shuffle).not.toBeNull();

    shuffle?.click();
    flushSync();

    expect(randomDraws).toEqual([0]);
  });
});
