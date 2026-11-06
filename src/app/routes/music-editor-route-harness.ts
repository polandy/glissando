import type { MusicAnalysisPass, MusicAnalysisPassState } from "../../library/music-analysis-pass";
import { analysisPassFindingNone } from "../../library/testing/music-analysis-pass-finding-none";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { FakeClock, FakeFrameScheduler, FakeMusic } from "../../player/testing/fakes";
import { SlideshowEditor } from "../editing/slideshow-editor";
import type { MusicEditorAudio } from "../music-editor/music-editor-audio";
import { FakeScheduler } from "../../ui-kit/testing/fake-scheduler";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { Toaster } from "../toast/toaster";
import MusicEditorRoute from "./MusicEditorRoute.svelte";
import { songIntakeStoringIn } from "../music-editor/testing/song-intake-device";
import { shownDetailsStore } from "../music-editor/music-editor-harness";

const SHOW: StoredSlideshow = {
  id: "show",
  title: "Juli 2025",
  createdAt: "2025-07-02T00:00:00Z",
  pictures: [
    {
      id: "a",
      capturedAt: "2025-07-01T10:00:00Z",
      width: 1,
      height: 1,
      fileName: "a.jpg",
      colours: { veil: "#404040", accent: "#C0C0C0" },
    },
  ],
  songs: [
    {
      id: "m1",
      fileName: "Sommerwind.mp3",
      durationMs: 60_000,
      mimeType: "audio/mpeg",
      trim: { startMs: 12_000, endMs: 40_000 },
    },
  ],
  secondsPerPicture: 5,
};

export const WITHOUT_MUSIC: StoredSlideshow = { ...SHOW, songs: [] };
export const TWO_SONGS: StoredSlideshow = {
  ...SHOW,
  songs: [
    ...SHOW.songs,
    { id: "m2", fileName: "Low Tide.mp3", durationMs: 30_000, mimeType: "audio/mpeg" },
  ],
};

/** Browser audio stand-ins; `loaded(n)` settles with the blob of the n-th song audio the route opened. */
function fakeAudio() {
  const music = new FakeMusic();
  const urls = { created: [] as string[], revoked: [] as string[] };
  const blobs: Promise<Blob>[] = [];
  const opened: ((blob: Blob) => void)[] = [];
  const blobAt = (index: number): Promise<Blob> =>
    (blobs[index] ??= new Promise((resolve) => (opened[index] = resolve)));
  let openedCount = 0;
  const audio: MusicEditorAudio = {
    playback: (url) => {
      urls.created.push(url);
      return music;
    },
    createUrl: (blob) => {
      const index = openedCount++;
      void blobAt(index);
      opened[index]?.(blob);
      return "blob:music";
    },
    revokeUrl: (url) => urls.revoked.push(url),
    clock: new FakeClock(),
    frames: new FakeFrameScheduler(),
  };
  return { audio, music, urls, loaded: blobAt };
}

/** An editor telling when songs were added, as the intake adds them after reading and storing. */
class WatchedEditor extends SlideshowEditor {
  readonly #added: (() => void)[] = [];
  readonly songsAdded = new Promise<void>((resolve) => this.#added.push(resolve));

  override addSongs(songs: Parameters<SlideshowEditor["addSongs"]>[0]): void {
    super.addSongs(songs);
    this.#added.forEach((resolve) => resolve());
  }
}

/** A music analysis pass the test drives: it only records whom it is asked to listen for. */
export class FakeAnalysisPass {
  readonly listenedFor: string[] = [];
  readonly #listeners = new Set<(state: MusicAnalysisPassState) => void>();
  #state: MusicAnalysisPassState = {
    running: false,
    listening: new Set(),
    found: new Map(),
    undecodable: new Set(),
  };

  subscribe(listener: (state: MusicAnalysisPassState) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  }

  listenFor(musicId: string): void {
    this.listenedFor.push(musicId);
  }

  publish(change: Partial<MusicAnalysisPassState>): void {
    this.#state = { ...this.#state, ...change };
    this.#listeners.forEach((listener) => listener(this.#state));
  }
}

let destroy = () => {};
export const unmountRoute = () => destroy();

/**
 * Mounts the route over a store holding `m1`'s audio. `makePass` builds the analysis pass from
 * that store, before the route reads it; the default finds nothing.
 */
export async function mountRoute(
  stored: StoredSlideshow = SHOW,
  makePass: (store: MemoryLibraryStore) => Pick<MusicAnalysisPass, "subscribe" | "listenFor"> = (
    store,
  ) => analysisPassFindingNone(store),
) {
  const store = new MemoryLibraryStore();
  await store.putPicture("a", { display: new Blob([]), thumbnail: new Blob([]) });
  await store.putMusic("m1", new Blob(["music bytes"], { type: "audio/mpeg" }));
  await store.saveSlideshow(stored);
  const errors: unknown[] = [];
  const editor = new WatchedEditor(stored, {
    store,
    toaster: new Toaster(new FakeScheduler()),
    newId: () => "claim-1",
    now: () => new Date("2026-10-08T12:00:00Z"),
    onError: (error) => errors.push(error),
    onGone: () => {},
    onRefused: () => {},
    removedText: () => "Bild entfernt",
    addedText: () => "Bilder hinzugefügt",
    undoLabel: () => "Rückgängig",
    lastPictureText: () => "Das letzte Bild bleibt.",
    everyPictureText: () => "Mindestens ein Bild bleibt.",
    motionAutomaticText: () => "Bewegung wieder automatisch",
    timingAutomaticText: () => "Zeitablauf wieder automatisch",
    captionClearedText: () => "Bildtitel entfernt",
    slideshowTransitionResetText: () => "Übergänge wieder auf Überblenden",
    openingCardRemovedText: () => "Titelbild entfernt",
    closingCardRemovedText: () => "Schlussbild entfernt",
    chapterDeletedText: () => "Kapitel gelöscht",
    chapterTitleResetText: () => "Kapiteltitel wieder automatisch",
    chapterSubtitleResetText: () => "Kapitel-Untertitel wieder automatisch",
    clipResetText: () => "Clip zurückgesetzt",
    portraitPicturesResetText: () => "Hochformatbilder wieder automatisch",
    lookResetText: () => "Look entfernt",
    moodResetText: () => "Stimmung ausgeschaltet",
    moodNowCustomText: () => "Keine Stimmung ist an",
    songRemovedText: () => "Song entfernt",
    shuffledText: () => "",
    sortedByDateText: () => "",
    random: () => 0,
    automaticTitle: () => "Juli 2025",
    locale: () => "de-DE",
    focusOf: () => undefined,
  });
  const pass = makePass(store);
  const fake = fakeAudio();
  let backs = 0;
  const mounted = mountWithTranslator(MusicEditorRoute, {
    store,
    stored,
    editor,
    analysisPass: pass,
    audio: fake.audio,
    songIntake: songIntakeStoringIn(store, (error) => errors.push(error)),
    saving: false,
    onBack: () => (backs += 1),
    onError: (error: unknown) => errors.push(error),
    log: (error: unknown) => errors.push(error),
    toaster: new Toaster(new FakeScheduler()),
    detailsStore: shownDetailsStore(),
  });
  destroy = mounted.destroy;
  return { ...fake, target: mounted.target, backs: () => backs, store, editor, errors };
}
