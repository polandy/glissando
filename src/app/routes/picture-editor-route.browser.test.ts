import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { FocusPass, type FocusPassState } from "../../library/focus-pass";
import type { PictureFocus } from "../../library/picture-focus";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { FakeFocusDetector } from "../../library/testing/fake-focus-detector";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { SlideshowEditor } from "../editing/slideshow-editor";
import { NO_FOCUS_KNOWN, picturesFocus } from "../focus/pictures-focus";
import { FakeScheduler } from "../testing/fake-scheduler";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { reactiveProps } from "../testing/reactive-props.svelte";
import { Toaster } from "../toast/toaster";
import PictureEditorRoute from "./PictureEditorRoute.svelte";

const SHOW: StoredSlideshow = {
  id: "show",
  title: "Juli 2025",
  createdAt: "2025-07-02T00:00:00Z",
  pictures: ["a", "b"].map((id) => ({
    id,
    capturedAt: "2025-07-01T10:00:00Z",
    width: 100,
    height: 100,
    fileName: `${id}.jpg`,
  })),
  secondsPerPicture: 5,
};

let destroy = () => {};
afterEach(() => destroy());

async function mountRoute(pictureId: string) {
  const store = new MemoryLibraryStore();
  for (const picture of SHOW.pictures) {
    await store.putPicture(picture.id, { display: new Blob([]), thumbnail: new Blob([]) });
  }
  await store.saveSlideshow(SHOW);
  const errors: unknown[] = [];
  const editor = new SlideshowEditor(SHOW, {
    store,
    toaster: new Toaster(new FakeScheduler()),
    newId: () => "claim-1",
    now: () => new Date("2026-10-08T12:00:00Z"),
    onError: (error) => errors.push(error),
    onGone: () => {},
    removedText: () => "Bild entfernt",
    undoLabel: () => "Rückgängig",
    lastPictureText: () => "Das letzte Bild bleibt.",
    motionAutomaticText: () => "Bewegung wieder automatisch",
    durationAutomaticText: () => "Dauer wieder automatisch",
    transitionAutomaticText: () => "Übergang wieder automatisch",
    slideshowTransitionResetText: () => "Übergänge wieder auf Überblenden",
    automaticTitle: () => "Juli 2025",
    focusOf: () => undefined,
  });
  let backs = 0;
  const props = reactiveProps({
    store,
    stored: SHOW,
    focus: NO_FOCUS_KNOWN,
    editor,
    pictureId,
    saving: false,
    onBack: () => (backs += 1),
    onOpen: () => {},
    onError: (error: unknown) => errors.push(error),
  });
  const mounted = mountWithTranslator(PictureEditorRoute, props);
  destroy = mounted.destroy;
  return { target: mounted.target, backs: () => backs, store, editor, errors, props };
}

const FACE: PictureFocus = { kind: "subject", box: { x: 0.4, y: 0.2, width: 0.2, height: 0.3 } };

/** Resolves with the first state of the pass that `matches`. */
function stateOf(pass: FocusPass, matches: (state: FocusPassState) => boolean): Promise<void> {
  return new Promise((resolve) => {
    const stop = pass.subscribe((state) => {
      if (matches(state)) {
        queueMicrotask(stop);
        resolve();
      }
    });
  });
}

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
    const found = { found: new Map([["b", FACE]]), searching: new Set<string>() };
    props.focus = found;
    flushSync();

    props.pictureId = "b";
    flushSync();

    const marker = target.querySelector('[role="img"][aria-label="Fokus: Gesicht erkannt"]');
    expect(marker).not.toBeNull();
    expect(marker?.getAnimations()).toEqual([]);
  });
});
