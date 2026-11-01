import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { FocusPass } from "../../library/focus-pass";
import type { PictureFocus } from "../../library/picture-focus";
import { FakeFocusDetector } from "../../library/testing/fake-focus-detector";
import { NO_FOCUS_KNOWN, picturesFocus } from "../focus/pictures-focus";
import {
  CLIP_BLOB,
  CLIP_VIDEO,
  FACE,
  fakeReadClipPeaks,
  mountRoute,
  neverReportingReadClipPeaks,
  OWN_MOTION,
  SHOW_WITH_OWN_MOTION,
  stateOf,
  unmountRoute,
} from "./picture-editor-route-harness";

afterEach(() => unmountRoute());

describe("the picture editor route", () => {
  it("shows a picture of the slideshow and stays", async () => {
    const { target, backs } = await mountRoute("b");

    expect(target.querySelector(".pic")).not.toBeNull();
    expect(backs()).toBe(0);
  });

  it("goes back to the slideshow when the picture is no longer in it", async () => {
    const { target, backs } = await mountRoute("gone");

    expect(target.querySelector(".pic")).toBeNull();
    expect(backs()).toBe(1);
  });

  it("stores the caption typed for the picture, normalised", async () => {
    const { target, store, editor, errors } = await mountRoute("b");
    const field = target.querySelector<HTMLInputElement>('input[type="text"]');
    if (field === null) {
      throw new Error("the caption field is missing");
    }

    field.value = "Abends  am Steg";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    await editor.settled();

    const stored = await store.getSlideshow("show");
    expect(stored.pictures[1]?.caption).toBe("Abends am Steg");
    expect(errors).toEqual([]);
  });

  it("clearing the caption raises an undo toast, and its undo puts the text back in the field", async () => {
    const { target, toaster, editor, props } = await mountRoute("b");
    const field = target.querySelector<HTMLInputElement>('input[type="text"]');
    if (field === null) {
      throw new Error("the caption field is missing");
    }
    field.value = "Abends am Steg";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    flushSync();
    expect(toaster.current).toBeNull();

    target.querySelector<HTMLButtonElement>('[aria-label="Bildtitel entfernen"]')?.click();
    flushSync();

    expect(toaster.current?.text).toBe("Bildtitel entfernt");
    expect(field.value).toBe("");

    toaster.act();
    props.stored = editor.slideshow;
    flushSync();
    await editor.settled();

    expect(field.value).toBe("Abends am Steg");
  });

  it("marks the focus the background pass finds while the picture is open", async () => {
    const { target, store, props } = await mountRoute("b");
    const detector = new FakeFocusDetector(() => FACE);
    const held = detector.holdNext();
    const pass = new FocusPass({ store, detector, log: () => {}, reportError: () => {} });
    // As the slideshow route does: what the pass finds joins the focus the editor shows.
    pass.subscribe((state) => (props.focus = picturesFocus(new Map(), state)));
    const searching = stateOf(pass, (state) => state.searching.has("b"));

    pass.start();
    await searching;
    flushSync();
    const marker = () => target.querySelector('[role="img"][aria-label="Fokus: Gesicht erkannt"]');
    expect(target.querySelector('[role="status"]')?.textContent?.trim()).toBe(
      "Fokus wird gesucht …",
    );
    expect(marker()).toBeNull();

    held.release();
    await pass.settled();
    flushSync();

    expect(marker()).not.toBeNull();
    expect(target.querySelector('[role="status"]')).toBeNull();
  });

  it("shows the next picture's known focus at once when ‹/› moves on to it", async () => {
    const { target, props } = await mountRoute("a");
    const found = { ...NO_FOCUS_KNOWN, found: new Map([["b", FACE]]) };
    props.focus = found;
    flushSync();

    props.pictureId = "b";
    flushSync();

    const marker = target.querySelector('[role="img"][aria-label="Fokus: Gesicht erkannt"]');
    expect(marker).not.toBeNull();
    expect(marker?.getAnimations()).toEqual([]);
  });

  it("reads the stored clip's blob and its source length", async () => {
    const { readClipPeaks, calledWith } = fakeReadClipPeaks();
    await mountRoute("c", readClipPeaks);

    const call = await calledWith;

    expect(await call.blob.text()).toBe(await CLIP_BLOB.text());
    expect(call.sourceMs).toBe(CLIP_VIDEO.sourceMs);
  });

  it("says the clip's sound cannot be read, and logs why, when the reader fails", async () => {
    const failure = new Error("no audio decoder in this browser");
    const { target, logged } = await mountRoute("c", () => Promise.reject(failure));

    expect(await logged).toBe(failure);
    flushSync();

    expect(target.textContent).toContain("Ton kann hier nicht gelesen werden");
  });

  it("aborts the reader's signal when the clip editor closes", async () => {
    const { readClipPeaks, calledWith } = fakeReadClipPeaks();
    await mountRoute("c", readClipPeaks);
    const call = await calledWith;
    expect(call.signal.aborted).toBe(false);

    unmountRoute();

    expect(call.signal.aborted).toBe(true);
  });

  it("looks again at an own-motion picture's focus without touching its motion or the stored slideshow", async () => {
    let answer: PictureFocus = FACE;
    const detector = new FakeFocusDetector(() => answer);
    let pass!: FocusPass;
    const { target, store, props } = await mountRoute(
      "p",
      neverReportingReadClipPeaks,
      SHOW_WITH_OWN_MOTION,
      (routeStore) => {
        pass = new FocusPass({ store: routeStore, detector, log: () => {}, reportError: () => {} });
        return pass;
      },
    );
    pass.subscribe((state) => (props.focus = picturesFocus(new Map(), state)));

    pass.start();
    await pass.settled();
    flushSync();

    expect(target.querySelector(".focus-line")?.textContent).toContain("Gesicht erkannt");
    const button = target.querySelector<HTMLButtonElement>(".focus-line .action");
    expect(button).not.toBeNull();

    answer = { kind: "scenery" };
    button?.click();
    await pass.settled();
    flushSync();

    expect(target.querySelector(".focus-line")?.textContent).toContain("Landschaft");
    const stored = await store.getSlideshow("show-own");
    expect(stored.pictures[0]?.kenBurns).toEqual(OWN_MOTION);
  });
});
