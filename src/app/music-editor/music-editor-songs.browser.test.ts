import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { SEQUENCE_BETWEEN_SONGS } from "../../library/own-music";
import { OWN_SECONDS_PICTURE_LENGTH } from "../../library/picture-length";
import {
  mountDetailed,
  mountEditor,
  slideshowOfSongs,
  song,
  text,
  unmountEditor,
} from "./music-editor-harness";

afterEach(() => unmountEditor());

/** Three minute-long songs, crossfading: they start at 0:00, 0:57 and 1:54. */
const THREE = [song("a", 60_000), song("b", 60_000), song("c", 60_000)];

const rows = (): string[] =>
  [...document.querySelectorAll(".song")].map(
    (row) => row.textContent?.replace(/\s+/g, " ").trim() ?? "",
  );
const grip = (name: string): HTMLElement => {
  const found = document.querySelector<HTMLElement>(`[aria-label="${name} verschieben"]`);
  if (found === null) throw new Error(`no grip for "${name}"`);
  return found;
};
const buttonNamed = (name: string): HTMLButtonElement => {
  const found = [...document.querySelectorAll("button")].find(
    (button) =>
      button.getAttribute("aria-label") === name ||
      button.textContent?.replace(/\s+/g, " ").trim() === name,
  );
  if (found === undefined) throw new Error(`no button named "${name}"`);
  return found;
};

describe("MusicEditorScreen, the playlist's songs", () => {
  it("lists the songs in order with their lengths and where each starts", () => {
    mountEditor(slideshowOfSongs(THREE));

    expect(rows()).toEqual([
      "1 a.mp3 1:00 Wird gemessen… ab 0:00",
      "2 b.mp3 1:00 Wird gemessen… ab 0:57",
      "3 c.mp3 1:00 Wird gemessen… ab 1:54",
    ]);
  });

  it("dims a song the slideshow never reaches as not reached", () => {
    mountEditor(slideshowOfSongs(THREE, { count: 4, pictureLength: OWN_SECONDS_PICTURE_LENGTH }));

    expect(rows()[1]).toBe("2 b.mp3 1:00 Wird gemessen… Nicht erreicht");
    expect(document.querySelectorAll(".song.unreached")).toHaveLength(2);
  });

  it("heads the waveform with the selected song's number and name, and selects by its row", () => {
    const { calls, set } = mountEditor(slideshowOfSongs(THREE));
    set({ selectedSongId: "b" });

    expect(text(".song-heading")).toBe("Song 2 · b.mp3");
    expect(document.querySelector(".song.selected")?.textContent).toContain("b.mp3");
    document.querySelectorAll<HTMLElement>(".song .pick")[2]?.click();

    expect(calls.selected).toEqual(["c"]);
  });

  it("moves a song with the arrow keys on its focused grip", () => {
    const { calls } = mountEditor(slideshowOfSongs(THREE));

    grip("b.mp3").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    grip("a.mp3").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));

    expect(calls.moves).toEqual(["b → 0"]);
  });

  it("drags a song by its grip onto another row", () => {
    const { calls } = mountEditor(slideshowOfSongs(THREE));
    const last = document.querySelectorAll(".song")[2]?.getBoundingClientRect();
    const from = grip("a.mp3").getBoundingClientRect();
    const at = (y: number) => ({ clientX: from.left, clientY: y, pointerId: 1, bubbles: true });

    grip("a.mp3").dispatchEvent(new PointerEvent("pointerdown", at(from.top + 2)));
    grip("a.mp3").dispatchEvent(new PointerEvent("pointermove", at((last?.top ?? 0) + 4)));
    flushSync();
    expect(document.querySelector(".song.drop")?.textContent).toContain("c.mp3");
    grip("a.mp3").dispatchEvent(new PointerEvent("pointerup", at((last?.top ?? 0) + 4)));

    expect(calls.moves).toEqual(["a → 2"]);
  });

  it("removes a song by its ×", () => {
    const { calls } = mountEditor(slideshowOfSongs(THREE));

    buttonNamed("b.mp3 entfernen").click();

    expect(calls.removed).toEqual(["b"]);
  });

  it("adds every picked file as a song", () => {
    const { calls } = mountEditor(slideshowOfSongs(THREE));
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    const picked = new DataTransfer();
    picked.items.add(new File(["x"], "Low Tide.mp3"));
    picked.items.add(new File(["y"], "Paper Lanterns.m4a"));

    expect(input?.multiple).toBe(true);
    if (input !== null) {
      input.files = picked.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }

    expect(calls.added).toEqual(["Low Tide.mp3", "Paper Lanterns.m4a"]);
  });

  it("shows a song being converted and an unusable one, which its × dismisses", () => {
    const { calls, set } = mountEditor(slideshowOfSongs(THREE));
    set({
      pending: [
        { key: 1, kind: "converting", pickedName: "Lanterns.m4a", source: "alac", progress: 0.42 },
        { key: 2, kind: "unusable", pickedName: "Concert.wma", reason: "unreadable" },
      ],
    });

    expect(text(".row")).toContain("Lanterns.m4a Wird in FLAC umgewandelt · 42 %");
    expect(text(".row.failed")).toBe("Concert.wma Diese Datei lässt sich nicht verwenden");
    buttonNamed("Concert.wma entfernen").click();

    expect(calls.dismissed).toEqual([2]);
  });
});

describe("MusicEditorScreen, between the songs", () => {
  it("offers the hand-over only with two songs or more", () => {
    mountEditor(slideshowOfSongs([song("a", 60_000)]));

    expect(text(".panel")).not.toContain("Zwischen den Songs");
    expect(text(".panel")).toContain("Bilddauer");
  });

  it("crossfades by default and stores one after another, and back", () => {
    const { calls, set } = mountEditor(slideshowOfSongs(THREE));

    expect(text(".panel")).toContain("Der nächste Song beginnt, während der vorige ausblendet.");
    buttonNamed("Nacheinander").click();
    set({ slideshow: slideshowOfSongs(THREE, { betweenSongs: SEQUENCE_BETWEEN_SONGS }) });
    buttonNamed("Überblenden").click();

    expect(calls.betweenSongs).toEqual([SEQUENCE_BETWEEN_SONGS, undefined]);
  });

  it("heads the panel's sections by the slideshow and the selected song", () => {
    const { set } = mountEditor(slideshowOfSongs(THREE));
    set({ selectedSongId: "c" });

    expect([...document.querySelectorAll(".panel .group-title")].map((e) => e.textContent)).toEqual(
      ["Diashow", "Song 3"],
    );
  });
});

describe("MusicEditorScreen, the playlist lane", () => {
  it("draws a block per song at its start, hatching the crossfades", () => {
    mountDetailed(slideshowOfSongs(THREE));

    const blocks = [...document.querySelectorAll<HTMLElement>(".playlist-lane .block")];
    expect(blocks.map((block) => block.textContent?.trim())).toEqual(["1", "2", "3"]);
    const lefts = blocks.map((block) => Number.parseFloat(block.style.left));
    [0, 32.7586, 65.5172].forEach((left, index) => expect(lefts[index]).toBeCloseTo(left, 3));
    expect(document.querySelectorAll(".playlist-lane .crossfade")).toHaveLength(2);
    expect(text(".lane-label")).toBe("Playlist, 3 Songs · 2:54 Überblendungen schraffiert");
  });

  it("marks where the slideshow ends before the playlist", () => {
    mountEditor(slideshowOfSongs(THREE, { count: 4, pictureLength: OWN_SECONDS_PICTURE_LENGTH }));

    expect(document.querySelector(".playlist-lane .end")?.getAttribute("title")).toBe(
      "Die Diashow endet",
    );
    expect(text(".playlist-timeline")).toContain("Die Musik blendet mit dem letzten Bild aus");
  });
});

describe("MusicEditorScreen without music", () => {
  it("says there is no music yet and offers to add a song", () => {
    const { calls } = mountEditor(slideshowOfSongs([]));

    expect(text(".empty")).toContain("Noch keine Musik");
    expect(document.querySelector(".wave")).toBeNull();
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    const picked = new DataTransfer();
    picked.items.add(new File(["x"], "Low Tide.mp3"));
    if (input !== null) {
      input.files = picked.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }

    expect(buttonNamed("Song hinzufügen")).toBeDefined();
    expect(calls.added).toEqual(["Low Tide.mp3"]);
  });
});

describe("MusicEditorScreen, the pictures under the selected song", () => {
  it("draws no pictures under a song the slideshow never reaches", () => {
    const { set } = mountDetailed(
      slideshowOfSongs(THREE, { count: 4, pictureLength: OWN_SECONDS_PICTURE_LENGTH }),
    );
    set({ selectedSongId: "c" });

    expect(text(".song-heading")).toBe("Song 3 · c.mp3");
    expect(document.querySelector(".wavebox .runs")).toBeNull();
  });

  it("runs the pictures under a song on into the next song, with no silence", () => {
    mountDetailed(
      slideshowOfSongs(THREE, { count: 30, pictureLength: OWN_SECONDS_PICTURE_LENGTH }),
    );

    expect(document.querySelector<HTMLElement>(".wavebox .runs")?.style.width).toContain("100%");
    expect(document.querySelector(".wavebox .over")).toBeNull();
  });
});
