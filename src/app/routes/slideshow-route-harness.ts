import type { FocusPass } from "../../library/focus-pass";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { MusicOutput } from "../../player";
import { browserMusicEditorAudio } from "../music-editor/music-editor-audio";
import { FakeScheduler } from "../../ui-kit/testing/fake-scheduler";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { reactiveProps } from "../testing/reactive-props.svelte";
import { Toaster } from "../toast/toaster";
import SlideshowRoute from "./SlideshowRoute.svelte";
import { fakeHtmlExportDevice } from "../html-export/testing/fake-html-export-ports";
import { FakeExportPorts } from "../video-export/testing/fake-export-ports";

/** Two pictures, "a" and "b"; the stored pictures are empty blobs, never real photos. */
export const SHOW: StoredSlideshow = {
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

/** Unmounts the route the last `mountRoute` mounted. */
export function unmountRoute(): void {
  destroy();
  destroy = () => {};
}

/** A store holding `SHOW`, its pictures as empty blobs. */
export async function storeWithShow(): Promise<MemoryLibraryStore> {
  const store = new MemoryLibraryStore();
  for (const picture of SHOW.pictures) {
    await store.putPicture(picture.id, { display: new Blob([]), thumbnail: new Blob([]) });
  }
  await store.saveSlideshow(SHOW);
  return store;
}

/** The slideshow route on `SHOW`, with the picture editor open on `editingPictureId`. */
export function mountRoute(
  store: MemoryLibraryStore,
  focusPass: Pick<FocusPass, "state" | "subscribe">,
  editingPictureId: string | null,
) {
  const errors: unknown[] = [];
  const toaster = new Toaster(new FakeScheduler());
  const musicOutput = new MusicOutput(() => null);
  const props = reactiveProps({
    store,
    focusPass,
    toaster,
    newId: () => "claim-1",
    now: () => new Date("2026-10-08T12:00:00Z"),
    slideshowId: SHOW.id,
    exportProgress: null,
    onExport: () => {},
    videoExport: new FakeExportPorts(),
    htmlExport: fakeHtmlExportDevice(),
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
    home: "device" as const,
    serverOn: false,
    onKeepCopy: () => {},
    onSaveOnServer: () => {},
  });
  const mounted = mountWithTranslator(SlideshowRoute, props);
  destroy = mounted.destroy;
  return { target: mounted.target, props, errors, toaster };
}
