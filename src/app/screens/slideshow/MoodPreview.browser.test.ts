import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import "../../../styles/tokens.css";
import { NO_SONG_BEATS, type SongBeats } from "../../../compose/playlist";
import type { StoredSlideshow } from "../../../library/stored-slideshow";
import { DRUMS } from "../../../library/testing/beat-pass-fixtures";
import { MemoryLibraryStore } from "../../../library/testing/memory-store";
import { MusicOutput } from "../../../player";
import { createTranslator } from "../../i18n/translator";
import { mountWithTranslator } from "../../testing/mount-with-translator";
import { reactiveProps } from "../../testing/reactive-props.svelte";
import { whenRendered } from "../../testing/when-rendered";
import type { MoodPreviewPorts } from "./mood-preview-ports";
import MoodPreview from "./MoodPreview.svelte";

const SHOW: StoredSlideshow = {
  id: "show",
  title: "July 2025",
  createdAt: "2025-07-02T00:00:00Z",
  pictures: [
    {
      id: "a",
      capturedAt: "2025-07-01T10:00:00Z",
      width: 100,
      height: 100,
      fileName: "a.jpg",
      colours: { veil: "#404040", accent: "#C0C0C0" },
    },
  ],
  secondsPerPicture: 5,
  songs: [],
};

let destroy = () => {};
afterEach(() => destroy());

type Props = {
  ports: MoodPreviewPorts;
  mood: MoodPreviewPorts["stored"]["mood"];
  moodBeats: SongBeats;
};

async function openPreview(
  mood: MoodPreviewPorts["stored"]["mood"] = undefined,
  moodBeats: SongBeats = NO_SONG_BEATS,
  display = new Blob([]),
) {
  const store = new MemoryLibraryStore();
  await store.putPicture("a", { display, thumbnail: new Blob([]) });
  const logged: unknown[] = [];
  let onFirstLog: (error: unknown) => void = () => {};
  const firstLogged = new Promise<unknown>((resolve) => (onFirstLog = resolve));
  const stored: StoredSlideshow = mood === undefined ? SHOW : { ...SHOW, mood };
  const ports: MoodPreviewPorts = {
    store,
    stored,
    musicOutput: new MusicOutput(() => null),
    decodeClipSound: () => Promise.resolve(null),
    log: (error: unknown) => {
      logged.push(error);
      onFirstLog(error);
    },
  };
  const props = reactiveProps<Props>({ ports, mood, moodBeats });
  const mounted = mountWithTranslator(MoodPreview, props, { current: createTranslator("en") });
  destroy = mounted.destroy;
  return { ...mounted, logged, firstLogged, props };
}

describe("MoodPreview", () => {
  it("shows the live preview once the pictures are loaded, with no badge over it", async () => {
    const { target } = await openPreview();

    const stage = await whenRendered(target, ".stage");

    expect(stage).not.toBeNull();
    expect(target.querySelector("button.sound")).not.toBeNull();
    expect(target.querySelector(".badge")).toBeNull();
  });

  it("starts with sound off, and the toggle turns it on", async () => {
    const { target } = await openPreview();

    const sound = await whenRendered(target, "button.sound");

    expect(sound.getAttribute("aria-pressed")).toBe("false");
    (sound as HTMLButtonElement).click();
    flushSync();
    expect(sound.getAttribute("aria-pressed")).toBe("true");
  });

  it("gives the sound toggle its accessible name", async () => {
    const { target } = await openPreview();

    const sound = await whenRendered(target, "button.sound");

    expect(sound.getAttribute("aria-label")).toBe("Sound");
  });

  it("gives the sound toggle the same background as the photo badge token", async () => {
    const { target } = await openPreview();

    const sound = await whenRendered(target, "button.sound");
    const probe = document.createElement("div");
    probe.style.background = "var(--gl-photo-badge)";
    target.append(probe);

    // Over a light picture a transparent toggle disappears; the toggle takes the same token a
    // photo badge would (MOOD.md), not the player's glass tint.
    expect(getComputedStyle(sound).backgroundColor).toBe(getComputedStyle(probe).backgroundColor);
  });

  it("logs the player's error when a picture cannot be shown, instead of staying black silently", async () => {
    const { target, firstLogged } = await openPreview(
      undefined,
      NO_SONG_BEATS,
      new Blob(["not a picture"], { type: "image/jpeg" }),
    );
    await whenRendered(target, ".stage");

    expect(await firstLogged).toBeInstanceOf(Error);
  });

  it("restarts the preview once the composed beats change", async () => {
    const store = new MemoryLibraryStore();
    await store.putPicture("a", { display: new Blob([]), thumbnail: new Blob([]) });
    await store.putMusic("m", new Blob([]));
    const stored: StoredSlideshow = {
      ...SHOW,
      mood: "calm",
      songs: [{ id: "m", fileName: "m.mp3", durationMs: 2000, mimeType: "audio/mpeg" }],
    };
    const logged: unknown[] = [];
    const ports: MoodPreviewPorts = {
      store,
      stored,
      musicOutput: new MusicOutput(() => null),
      decodeClipSound: () => Promise.resolve(null),
      log: (error: unknown) => logged.push(error),
    };
    const props = reactiveProps<Props>({ ports, mood: "calm", moodBeats: NO_SONG_BEATS });
    const mounted = mountWithTranslator(MoodPreview, props, { current: createTranslator("en") });
    destroy = mounted.destroy;

    const before = await whenRendered(mounted.target, ".stage");
    props.moodBeats = new Map([["m", DRUMS]]);
    flushSync();
    const after = mounted.target.querySelector(".stage");

    expect(after).not.toBeNull();
    expect(after).not.toBe(before);
  });
});
