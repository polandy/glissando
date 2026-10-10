import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { FocusPass } from "../../library/focus-pass";
import type { PictureFocus } from "../../library/picture-focus";
import { FakeFocusDetector } from "../../library/testing/fake-focus-detector";
import type { MemoryLibraryStore } from "../../library/testing/memory-store";
import { whenRendered } from "../testing/when-rendered";
import { mountRoute, storeWithShow, unmountRoute } from "./slideshow-route-harness";

const FACE: PictureFocus = { kind: "subject", box: { x: 0.4, y: 0.2, width: 0.2, height: 0.3 } };
const MARKER = '[role="img"][aria-label="Fokus: Gesicht erkannt"]';

afterEach(() => unmountRoute());

/** A store holding the slideshow, with the focus of picture "a" found on an earlier visit. */
async function storeWithFocusOfA(): Promise<MemoryLibraryStore> {
  const store = await storeWithShow();
  await store.putPictureFocus("a", FACE);
  return store;
}

describe("the slideshow route, the focus", () => {
  it("marks a focus stored on an earlier visit in the picture editor, detecting nothing", async () => {
    const store = await storeWithFocusOfA();
    const detector = new FakeFocusDetector(() => FACE);
    const pass = new FocusPass({ store, detector, log: () => {}, reportError: () => {} });

    const { target, errors } = mountRoute(store, pass, "a");

    expect(await whenRendered(target, MARKER)).not.toBeNull();
    expect(detector.calls).toBe(0);
    expect(errors).toEqual([]);
  });

  it("adds what the background pass finds to the focus stored before", async () => {
    const store = await storeWithFocusOfA();
    const detector = new FakeFocusDetector(() => FACE);
    const held = detector.holdNext();
    const pass = new FocusPass({ store, detector, log: () => {}, reportError: () => {} });
    const { target, props, errors } = mountRoute(store, pass, "b");
    await whenRendered(target, ".pic");

    pass.start();
    await whenRendered(target, '.focus-line [role="status"]');
    held.release();
    await pass.settled();
    flushSync();

    expect(target.querySelector(MARKER)).not.toBeNull();
    props.editingPictureId = "a";
    flushSync();
    expect(target.querySelector(MARKER)).not.toBeNull();
    expect(detector.calls).toBe(1);
    expect(errors).toEqual([]);
  });
});
