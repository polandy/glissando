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

const SHOW: StoredSlideshow = {
  id: "show",
  title: "Juli 2025",
  createdAt: "2025-07-02T00:00:00Z",
  pictures: [
    { id: "a", capturedAt: "2025-07-01T10:00:00Z", width: 1, height: 1, fileName: "a.jpg" },
  ],
  music: {
    id: "m1",
    fileName: "Sommerwind.mp3",
    durationMs: 60_000,
    mimeType: "audio/mpeg",
    trim: { startMs: 12_000, endMs: 40_000 },
  },
  secondsPerPicture: 5,
};

let destroy = () => {};
afterEach(() => destroy());

/** Browser audio stand-ins; `decoded` settles once the route asked for the waveform. */
function fakeAudio() {
  const music = new FakeMusic();
  const urls = { created: [] as string[], revoked: [] as string[] };
  let decode: { blob: Blob; resolve: (peaks: Float32Array) => void } | null = null;
  let asked: () => void = () => {};
  const decodeAsked = new Promise<void>((resolve) => (asked = resolve));
  const audio: MusicEditorAudio = {
    decodePeaks: (blob) =>
      new Promise((resolve) => {
        decode = { blob, resolve };
        asked();
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
  const requested = (): { blob: Blob; resolve: (peaks: Float32Array) => void } => {
    if (decode === null) {
      throw new Error("the route asked for no waveform");
    }
    return decode;
  };
  const decoded = async (peaks: Float32Array) => {
    await decodeAsked;
    const pending = requested();
    pending.resolve(peaks);
    await Promise.resolve();
    flushSync();
    return pending.blob;
  };
  return { audio, music, urls, decodeAsked, decoded };
}

async function mountRoute(stored: StoredSlideshow = SHOW) {
  const store = new MemoryLibraryStore();
  await store.putPicture("a", { display: new Blob([]), thumbnail: new Blob([]) });
  await store.putMusic("m1", new Blob(["music bytes"], { type: "audio/mpeg" }));
  await store.saveSlideshow(stored);
  const errors: unknown[] = [];
  const editor = new SlideshowEditor(stored, {
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
    automaticTitle: () => "Juli 2025",
    focusOf: () => undefined,
  });
  const fake = fakeAudio();
  let backs = 0;
  const mounted = mountWithTranslator(MusicEditorRoute, {
    store,
    stored,
    editor,
    audio: fake.audio,
    saving: false,
    onBack: () => (backs += 1),
    onError: (error: unknown) => errors.push(error),
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

    const fadeIn = target.querySelectorAll<HTMLButtonElement>('[role="radiogroup"]')[0];
    fadeIn?.querySelectorAll("button")[2]?.click();
    await editor.settled();

    expect((await store.getSlideshow("show")).music?.fadeInMs).toBe(5000);
  });

  it("lets go of the track's audio and address when left", async () => {
    const { music, urls, decodeAsked } = await mountRoute();
    await decodeAsked;

    destroy();

    expect(music.calls.at(-1)).toBe("dispose");
    expect(urls.revoked).toEqual(["blob:music"]);
  });

  it("goes back to the slideshow when it has no music", async () => {
    const { id, title, createdAt, pictures, secondsPerPicture } = SHOW;
    const { target, backs } = await mountRoute({
      id,
      title,
      createdAt,
      pictures,
      secondsPerPicture,
    });

    expect(target.querySelector(".wave")).toBeNull();
    expect(backs()).toBe(1);
  });
});
