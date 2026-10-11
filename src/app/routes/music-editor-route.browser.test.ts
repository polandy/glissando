import { beatPassFindingNone } from "../../library/testing/beat-pass-finding-none";
import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { FakeClock, FakeFrameScheduler, FakeMusic } from "../../player/testing/fakes";
import { SlideshowEditor } from "../editing/slideshow-editor";
import type { MusicEditorAudio } from "../music-editor/music-editor-audio";
import { FakeScheduler } from "../../ui-kit/testing/fake-scheduler";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { Toaster } from "../toast/toaster";
import MusicEditorRoute from "./MusicEditorRoute.svelte";
import { PICKED_SONG_MS, songIntakeStoringIn } from "../music-editor/testing/song-intake-device";

const SHOW: StoredSlideshow = {
  id: "show",
  title: "Juli 2025",
  createdAt: "2025-07-02T00:00:00Z",
  pictures: [
    { id: "a", capturedAt: "2025-07-01T10:00:00Z", width: 1, height: 1, fileName: "a.jpg" },
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

const WITHOUT_MUSIC: StoredSlideshow = { ...SHOW, songs: [] };
const TWO_SONGS: StoredSlideshow = {
  ...SHOW,
  songs: [
    ...SHOW.songs,
    { id: "m2", fileName: "Low Tide.mp3", durationMs: 30_000, mimeType: "audio/mpeg" },
  ],
};

/** Picks `file` in the editor's file input, as the browser reports a pick. */
function pick(target: HTMLElement, file: File): void {
  const input = target.ownerDocument.querySelector<HTMLInputElement>('input[type="file"]');
  if (input === null) throw new Error("no file input");
  const picked = new DataTransfer();
  picked.items.add(file);
  input.files = picked.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

let destroy = () => {};
afterEach(() => destroy());

/** Browser audio stand-ins; each `decoded` answers the route's next waveform request. */
function fakeAudio() {
  const music = new FakeMusic();
  const urls = { created: [] as string[], revoked: [] as string[] };
  type DecodeRequest = { blob: Blob; resolve: (peaks: Float32Array) => void };
  const requests: Promise<DecodeRequest>[] = [];
  const asked: ((request: DecodeRequest) => void)[] = [];
  const request = (index: number): Promise<DecodeRequest> =>
    (requests[index] ??= new Promise((resolve) => (asked[index] = resolve)));
  let askedCount = 0;
  const audio: MusicEditorAudio = {
    decodePeaks: (blob) =>
      new Promise((resolve) => {
        const index = askedCount++;
        void request(index);
        asked[index]?.({ blob, resolve });
      }),
    playback: (url) => {
      urls.created.push(url);
      return music;
    },
    createUrl: () => "blob:music",
    revokeUrl: (url) => urls.revoked.push(url),
    clock: new FakeClock(),
    frames: new FakeFrameScheduler(),
  };
  const decodeAsked = request(0).then(() => {});
  let answered = 0;
  const decoded = async (peaks: Float32Array) => {
    const pending = await request(answered++);
    pending.resolve(peaks);
    await Promise.resolve();
    flushSync();
    return pending.blob;
  };
  return { audio, music, urls, decodeAsked, decoded };
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

async function mountRoute(stored: StoredSlideshow = SHOW) {
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
    durationAutomaticText: () => "Dauer wieder automatisch",
    transitionAutomaticText: () => "Übergang wieder automatisch",
    slideshowTransitionResetText: () => "Übergänge wieder auf Überblenden",
    songRemovedText: () => "Song entfernt",
    automaticTitle: () => "Juli 2025",
    focusOf: () => undefined,
  });
  const fake = fakeAudio();
  let backs = 0;
  const mounted = mountWithTranslator(MusicEditorRoute, {
    store,
    stored,
    editor,
    beatPass: beatPassFindingNone(store),
    audio: fake.audio,
    songIntake: songIntakeStoringIn(store, (error) => errors.push(error)),
    saving: false,
    onBack: () => (backs += 1),
    onError: (error: unknown) => errors.push(error),
    log: (error: unknown) => errors.push(error),
  });
  destroy = mounted.destroy;
  return { ...fake, target: mounted.target, backs: () => backs, store, editor, errors };
}

describe("the music editor route", () => {
  it("draws the stored track's waveform once it is decoded", async () => {
    const { target, decoded } = await mountRoute();

    const blob = await decoded(Float32Array.from({ length: 1000 }, () => 0.5));

    expect(await blob.text()).toBe("music bytes");
    const heights = [...target.querySelectorAll(".bars rect.inside")].map((bar) =>
      bar.getAttribute("height"),
    );
    expect(heights).toContain("100");
  });

  it("listens to the stored track from the excerpt's start", async () => {
    const { target, music, urls, decodeAsked } = await mountRoute();
    await decodeAsked;

    target.querySelector<HTMLButtonElement>(".listen-btn")?.click();

    expect(urls.created).toEqual(["blob:music"]);
    expect(music.calls).toEqual(["play@12"]);
  });

  it("stores a fade picked", async () => {
    const { target, store, editor } = await mountRoute();

    const fadeIn = target.querySelector('[role="radiogroup"][aria-labelledby="music-fade-in"]');
    fadeIn?.querySelectorAll("button")[2]?.click();
    await editor.settled();

    expect((await store.getSlideshow("show")).songs[0]?.fadeInMs).toBe(5000);
  });

  it("lets go of the track's audio and address when left", async () => {
    const { music, urls, decodeAsked } = await mountRoute();
    await decodeAsked;

    destroy();

    expect(music.calls.at(-1)).toBe("dispose");
    expect(urls.revoked).toEqual(["blob:music"]);
  });

  it("offers to add a song to a slideshow without music, staying open", async () => {
    const { target, backs } = await mountRoute(WITHOUT_MUSIC);

    expect(target.querySelector(".empty")?.textContent).toContain("Noch keine Musik");
    expect(backs()).toBe(0);
  });

  it("stores a picked song in the playlist and shows it", async () => {
    const { target, store, editor, errors } = await mountRoute(WITHOUT_MUSIC);

    pick(target, new File(["ID3 tune"], "Low Tide.mp3", { type: "audio/mpeg" }));
    await editor.songsAdded;
    await editor.settled();

    expect(errors).toEqual([]);
    expect((await store.getSlideshow("show")).songs).toEqual([
      {
        id: "song-1",
        fileName: "Low Tide.mp3",
        durationMs: PICKED_SONG_MS,
        mimeType: "audio/mpeg",
      },
    ]);
  });

  it("draws the waveform of the song selected in the list", async () => {
    const { target, decoded, store } = await mountRoute(TWO_SONGS);
    await store.putMusic("m2", new Blob(["second song"], { type: "audio/mpeg" }));
    await decoded(Float32Array.from({ length: 1000 }, () => 0.5));

    target.querySelectorAll<HTMLButtonElement>(".song .pick")[1]?.click();
    flushSync();
    const blob = await decoded(Float32Array.from({ length: 1000 }, () => 0.5));

    expect(await blob.text()).toBe("second song");
    expect(target.querySelector(".song-heading")?.textContent?.trim()).toBe(
      "Song 2 · Low Tide.mp3",
    );
  });
});
