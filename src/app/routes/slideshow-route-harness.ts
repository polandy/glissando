import { songIntakeStoringIn } from "../music-editor/testing/song-intake-device";
import { createStorageMusicEditorDetailsStore } from "../music-editor/music-editor-details";
import { createStorageFineSettingsFoldStore } from "../screens/slideshow/fine-settings-fold";
import { createMemoryStorage } from "../testing/memory-storage";
import { analysisPassFindingNone } from "../../library/testing/music-analysis-pass-finding-none";
import type { FocusPass } from "../../library/focus-pass";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { MusicOutput } from "../../player";
import { browserMusicEditorAudio } from "../music-editor/music-editor-audio";
import { FakeScheduler } from "../../ui-kit/testing/fake-scheduler";
import { createMountSlot, storedPicture } from "../testing/picture-fixtures";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { reactiveProps } from "../testing/reactive-props.svelte";
import { Toaster } from "../toast/toaster";
import SlideshowRoute from "./SlideshowRoute.svelte";
import { fakeHtmlExportDevice } from "../html-export/testing/fake-html-export-ports";
import { FakeExportPorts } from "../video-export/testing/fake-export-ports";

/** Two pictures, "a" and "b"; the stored pictures are empty blobs, never real photos. */
const SHOW: StoredSlideshow = {
  id: "show",
  title: "Juli 2025",
  createdAt: "2025-07-02T00:00:00Z",
  pictures: ["a", "b"].map((id) => storedPicture(id)),
  secondsPerPicture: 5,
  songs: [],
};

const mountSlot = createMountSlot();

/** Unmounts the route the last `mountRoute` mounted. */
export function unmountRoute(): void {
  mountSlot.release();
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
  focusPass: Pick<FocusPass, "state" | "subscribe" | "lookAgain">,
  editingPictureId: string | null,
) {
  const errors: unknown[] = [];
  /** What each draw of the route's `random` returned, in order. */
  const randomDraws: number[] = [];
  const toaster = new Toaster(new FakeScheduler());
  const musicOutput = new MusicOutput(() => null);
  const props = reactiveProps({
    store,
    focusPass,
    analysisPass: analysisPassFindingNone(store),
    toaster,
    newId: () => "claim-1",
    now: () => new Date("2026-10-08T12:00:00Z"),
    random: () => {
      randomDraws.push(0);
      return 0;
    },
    playbackQuality: "1440" as const,
    slideshowId: SHOW.id,
    exportProgress: null,
    onExport: () => Promise.resolve("saved" as const),
    videoExport: new FakeExportPorts(),
    htmlExport: fakeHtmlExportDevice(),
    playing: null,
    editingPictureId,
    editingMusic: false,
    musicAudio: browserMusicEditorAudio(musicOutput),
    musicOutput,
    decodeClipSound: () => Promise.resolve(null),
    readClipPeaks: () => new Promise<void>(() => {}),
    songIntake: songIntakeStoringIn(store, (error) => errors.push(error)),
    onBack: () => {},
    onPlay: () => {},
    onPlayFrom: () => {},
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
    fineSettingsFold: createStorageFineSettingsFoldStore(createMemoryStorage()),
    musicEditorDetails: createStorageMusicEditorDetailsStore(createMemoryStorage()),
    serverSessions: {
      newShareLinkSession: (): never => {
        throw new Error("a device slideshow has no link to share");
      },
      newTvSession: (): never => {
        throw new Error("a device slideshow is not shown on a TV from its screen");
      },
    },
  });
  const mounted = mountWithTranslator(SlideshowRoute, props);
  mountSlot.hold(mounted.destroy);
  return { target: mounted.target, props, errors, toaster, randomDraws };
}
