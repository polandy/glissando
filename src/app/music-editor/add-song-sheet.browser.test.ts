import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { NetworkStatus } from "../../immich/immich-availability";
import type { SampleTrackId } from "../../sample-music/sample-tracks";
import {
  SamplePreview,
  type SamplePreviewAudio,
  type SamplePreviewPorts,
} from "../sample-music/sample-preview";
import { mountEditor, slideshowOfSongs, song, unmountEditor } from "./music-editor-harness";

afterEach(() => unmountEditor());

class FakeNetwork implements NetworkStatus {
  isOnline(): boolean {
    return true;
  }

  onChange(): () => void {
    return () => undefined;
  }
}

const dummyAudio = (): SamplePreviewAudio => ({
  src: "",
  currentTime: 0,
  play: () => Promise.resolve(),
  pause: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
});

function samplePreviewWith(overrides: Partial<SamplePreviewPorts> = {}): SamplePreview {
  return new SamplePreview({
    baseUrl: "https://assets.example/music/",
    hasMusic: () => Promise.resolve(false),
    musicBlob: () => Promise.reject(new Error("not stored")),
    network: new FakeNetwork(),
    createAudioElement: dummyAudio,
    create: () => "blob:0",
    revoke: () => undefined,
    ...overrides,
  });
}

const buttonNamed = (name: string): HTMLButtonElement => {
  const found = [...document.querySelectorAll("button")].find(
    (button) =>
      button.getAttribute("aria-label") === name ||
      button.textContent?.replace(/\s+/g, " ").trim() === name,
  );
  if (found === undefined) throw new Error(`no button named "${name}"`);
  return found;
};

const dialog = (): HTMLDialogElement | null => document.querySelector("dialog");

const cardFor = (title: string): HTMLElement => {
  const card = [...document.querySelectorAll(".card")].find(
    (candidate) => candidate.querySelector(".name")?.textContent?.trim() === title,
  );
  if (card === undefined) throw new Error(`no card for "${title}"`);
  return card as HTMLElement;
};

describe("MusicEditorScreen, the 'Add a song' sheet", () => {
  it("opens from the empty playlist's call to action, the sample block unfolded already", () => {
    mountEditor(slideshowOfSongs([]), undefined, undefined, samplePreviewWith());

    buttonNamed("Song hinzufügen").click();
    flushSync();

    expect(dialog()?.open).toBe(true);
    expect(dialog()?.querySelector(".block .toggle")?.getAttribute("aria-expanded")).toBe("true");
    expect(dialog()?.querySelector(".own-title")).not.toBeNull();
  });

  it("opens from the playlist's own 'Add a song' button too", () => {
    mountEditor(slideshowOfSongs([song("a", 60_000)]), undefined, undefined, samplePreviewWith());

    buttonNamed("Song hinzufügen").click();
    flushSync();

    expect(dialog()?.open).toBe(true);
  });

  it("offers no sheet, only the file picker, with sample music off", () => {
    mountEditor(slideshowOfSongs([]));

    buttonNamed("Song hinzufügen").click();
    flushSync();

    expect(dialog()).toBeNull();
  });

  it("shows no tab at all, both blocks together", () => {
    mountEditor(slideshowOfSongs([]), undefined, undefined, samplePreviewWith());
    buttonNamed("Song hinzufügen").click();
    flushSync();

    expect(dialog()?.querySelector('[role="tablist"]')).toBeNull();
    expect(dialog()?.querySelector(".block .grid")).not.toBeNull();
    expect(dialog()?.querySelector(".own-title")).not.toBeNull();
  });

  it("adds a sample track from the sheet, then removes its still-downloading row", () => {
    const { calls, set } = mountEditor(
      slideshowOfSongs([]),
      undefined,
      undefined,
      samplePreviewWith(),
    );
    buttonNamed("Song hinzufügen").click();
    flushSync();

    cardFor("Hold the Frame").querySelector<HTMLButtonElement>(".plus")?.click();
    expect(calls.addedSampleTracks).toEqual(["hold-the-frame"]);

    // The track is now a downloading row, not yet a song: toggling it again takes the row away.
    set({ isSampleTrackAdded: (trackId: SampleTrackId) => trackId === "hold-the-frame" });
    cardFor("Hold the Frame").querySelector<HTMLButtonElement>(".plus")?.click();

    expect(calls.removedSampleRows).toEqual(["hold-the-frame"]);
  });

  it("removes the song itself when the sheet toggles an already-chosen sample track", () => {
    const sampleSong = { ...song("hold-the-frame", 175_099), sampleTrack: "hold-the-frame" };
    const { calls } = mountEditor(
      slideshowOfSongs([sampleSong]),
      undefined,
      undefined,
      samplePreviewWith(),
    );
    buttonNamed("Song hinzufügen").click();
    flushSync();

    cardFor("Hold the Frame").querySelector<HTMLButtonElement>(".plus")?.click();

    expect(calls.removed).toEqual(["hold-the-frame"]);
    expect(calls.removedSampleRows).toEqual([]);
  });

  it("closes with Done", () => {
    const { calls } = mountEditor(slideshowOfSongs([]), undefined, undefined, samplePreviewWith());
    buttonNamed("Song hinzufügen").click();
    flushSync();

    buttonNamed("Fertig").click();
    flushSync();

    expect(dialog()).toBeNull();
    expect(calls.addedSampleTracks).toEqual([]);
  });

  it("closes with Escape", () => {
    mountEditor(slideshowOfSongs([]), undefined, undefined, samplePreviewWith());
    buttonNamed("Song hinzufügen").click();
    flushSync();
    const sheet = dialog();

    sheet?.dispatchEvent(new Event("cancel", { cancelable: true }));
    flushSync();

    expect(dialog()).toBeNull();
  });
});
