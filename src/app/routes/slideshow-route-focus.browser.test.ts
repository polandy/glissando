import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { FocusPass } from "../../library/focus-pass";
import type { PictureFocus } from "../../library/picture-focus";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { FakeFocusDetector } from "../../library/testing/fake-focus-detector";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { MusicOutput } from "../../player";
import { browserMusicEditorAudio } from "../music-editor/music-editor-audio";
import { FakeScheduler } from "../testing/fake-scheduler";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { reactiveProps } from "../testing/reactive-props.svelte";
import { whenRendered } from "../testing/when-rendered";
import { Toaster } from "../toast/toaster";
import SlideshowRoute from "./SlideshowRoute.svelte";
import { FakeExportPorts } from "../video-export/testing/fake-export-ports";

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

const FACE: PictureFocus = { kind: "subject", box: { x: 0.4, y: 0.2, width: 0.2, height: 0.3 } };
const MARKER = '[role="img"][aria-label="Fokus: Gesicht erkannt"]';

let destroy = () => {};
afterEach(() => destroy());

/** A store holding the slideshow, with the focus of picture "a" found on an earlier visit. */
async function storeWithFocusOfA(): Promise<MemoryLibraryStore> {
  const store = new MemoryLibraryStore();
  for (const picture of SHOW.pictures) {
    await store.putPicture(picture.id, { display: new Blob([]), thumbnail: new Blob([]) });
  }
  await store.saveSlideshow(SHOW);
  await store.putPictureFocus("a", FACE);
  return store;
}

function mountRoute(store: MemoryLibraryStore, focusPass: FocusPass, editingPictureId: string) {
  const errors: unknown[] = [];
  const musicOutput = new MusicOutput(() => null);
  const props = reactiveProps({
    store,
    focusPass,
    toaster: new Toaster(new FakeScheduler()),
    newId: () => "claim-1",
    now: () => new Date("2026-10-08T12:00:00Z"),
    slideshowId: SHOW.id,
    exportProgress: null,
    onExport: () => {},
    videoExport: new FakeExportPorts(),
    playing: false,
    editingPictureId,
    editingMusic: false,
    musicAudio: browserMusicEditorAudio(musicOutput),
    musicOutput,
    onBack: () => {},
    onPlay: () => {},
    onAddPictures: () => {},
    addedPictureIds: [],
    onEdit: () => {},
    onEditMusic: () => {},
    onDeleted: () => {},
    onGone: () => {},
    onError: (error: unknown) => errors.push(error),
    log: (error: unknown) => errors.push(error),
  });
  const mounted = mountWithTranslator(SlideshowRoute, props);
  destroy = mounted.destroy;
  return { target: mounted.target, props, errors };
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
