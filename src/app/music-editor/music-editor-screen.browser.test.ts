import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import {
  drag,
  handle,
  mountEditor,
  slideshowWith,
  text,
  TRACK_MS,
  unmountEditor,
  xOf,
} from "./music-editor-harness";

afterEach(() => unmountEditor());

const buttonNamed = (name: string): HTMLButtonElement => {
  const found = [...document.querySelectorAll("button")].find(
    (button) => button.textContent?.replace(/\s+/g, " ").trim() === name,
  );
  if (found === undefined) {
    throw new Error(`no button named "${name}"`);
  }
  return found;
};

const TRIMMED = { trim: { startMs: 12_000, endMs: 150_000 } };

describe("MusicEditorScreen, the excerpt", () => {
  it("shows the whole track, its length, and says the slideshow uses all of it", () => {
    mountEditor();

    expect(text(".head")).toBe("Sommerwind.mp3 3:24");
    expect(text("#music-excerpt + .state")).toBe("Ganzer Titel");
    expect(text(".panel")).toContain("Die Diashow nutzt den ganzen Titel, 3:24.");
    expect(handle("Anfang").getAttribute("aria-valuetext")).toBe("0:00,0");
    expect(handle("Ende").getAttribute("aria-valuetext")).toBe("3:24,0");
  });

  it("names a trimmed excerpt's length and offers the whole track back", () => {
    const { calls } = mountEditor(slideshowWith(TRIMMED));

    expect(text(".head")).toBe("Sommerwind.mp3 3:24 · gekürzt auf 2:18");
    buttonNamed("Ganzer Titel").click();

    expect(calls.trims).toEqual([undefined]);
  });

  it("drags a handle to a tenth of a second, keeping where it was grabbed", () => {
    const { calls } = mountEditor(slideshowWith(TRIMMED));

    drag(handle("Anfang"), 12_000, 20_040);

    expect(calls.trims).toEqual([{ startMs: 20_000, endMs: 150_000 }]);
  });

  it("moves the nearer handle when the waveform is grabbed anywhere", () => {
    const { calls } = mountEditor(slideshowWith(TRIMMED));
    const wave = document.querySelector(".wave") as Element;

    drag(wave, 140_000, 130_000);

    expect(calls.trims).toEqual([{ startMs: 12_000, endMs: 140_000 }]);
  });

  it("follows a drag live before storing it on release", () => {
    const { calls } = mountEditor(slideshowWith(TRIMMED));
    const at = (ms: number) => ({ clientX: xOf(ms), clientY: 0, pointerId: 1, bubbles: true });

    handle("Anfang").dispatchEvent(new PointerEvent("pointerdown", at(12_000)));
    window.dispatchEvent(new PointerEvent("pointermove", at(30_000)));
    flushSync();

    expect(handle("Anfang").getAttribute("aria-valuetext")).toBe("0:30,0");
    expect(text(".head")).toBe("Sommerwind.mp3 3:24 · gekürzt auf 2:00");
    expect(calls.trims).toEqual([]);
    window.dispatchEvent(new PointerEvent("pointerup", at(30_000)));
    expect(calls.trims).toEqual([{ startMs: 30_000, endMs: 150_000 }]);
  });

  it("steps a handle with the arrow keys: a tenth, a second with Shift", () => {
    const { calls } = mountEditor(slideshowWith(TRIMMED));

    handle("Anfang").dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
    handle("Ende").dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", shiftKey: true, bubbles: true }),
    );

    expect(calls.trims).toEqual([
      { startMs: 12_100, endMs: 150_000 },
      { startMs: 12_000, endMs: 149_000 },
    ]);
  });

  it("stores nothing for an arrow key that cannot move the handle any further", () => {
    const { calls } = mountEditor(slideshowWith());
    const start = handle("Anfang");

    start.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    start.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));

    expect(calls.trims).toEqual([{ startMs: 100, endMs: TRACK_MS }]);
  });

  it("steps the start and the end by half a second with − and +", () => {
    const { calls } = mountEditor(slideshowWith(TRIMMED));

    document
      .querySelector<HTMLButtonElement>('[aria-label="Anfang eine halbe Sekunde später"]')
      ?.click();
    document
      .querySelector<HTMLButtonElement>('[aria-label="Ende eine halbe Sekunde früher"]')
      ?.click();

    expect(calls.trims).toEqual([
      { startMs: 12_500, endMs: 150_000 },
      { startMs: 12_000, endMs: 149_500 },
    ]);
  });
});

describe("MusicEditorScreen, the fades", () => {
  const fadeGroup = (name: string) =>
    [...document.querySelectorAll<HTMLElement>('[role="radiogroup"]')].find(
      (group) =>
        document.getElementById(group.getAttribute("aria-labelledby") ?? "")?.textContent === name,
    ) as HTMLElement;
  const checked = (name: string) =>
    fadeGroup(name)
      .querySelector('[aria-checked="true"]')
      ?.textContent?.replace(/\s+/g, " ")
      .trim();

  it("shows the automatic choices and why they are what they are", () => {
    mountEditor(slideshowWith(TRIMMED));

    expect(checked("Einblenden")).toBe("Kurz 2 s");
    expect(checked("Ausblenden")).toBe("Kurz 2 s");
    expect(text(".panel")).toContain(
      "Automatisch: kurz, weil der Ausschnitt mitten im Titel beginnt.",
    );
    expect(text(".panel")).toContain(
      "Automatisch: kurz, weil der Ausschnitt vor dem Titelende aufhört.",
    );
  });

  it("explains a fade-out where the slideshow ends before the excerpt", () => {
    mountEditor(slideshowWith({}, { count: 4, durations: { 0: 5000, 1: 5000, 2: 5000, 3: 5000 } }));

    expect(text(".panel")).toContain("Automatisch: kurz, weil die Diashow bei 0:20 endet.");
  });

  it("picks an own fade, and goes back to automatic", () => {
    const { calls, set } = mountEditor(slideshowWith(TRIMMED));

    (fadeGroup("Einblenden").querySelectorAll("button")[2] as HTMLButtonElement).click();
    set({ slideshow: slideshowWith({ ...TRIMMED, fadeInMs: 5000 }) });
    buttonNamed("Zurück auf automatisch").click();

    expect(calls.fadesIn).toEqual([5000, undefined]);
    expect(checked("Einblenden")).toBe("Lang 5 s");
  });
});

describe("MusicEditorScreen, the pictures' times and listening", () => {
  it("names the share of each picture without an own duration", () => {
    mountEditor(slideshowWith(TRIMMED, { count: 24, durations: { 2: 8000 } }));

    expect(text(".note")).toBe(
      "Bildzeiten 23 Bilder ohne eigene Dauer teilen sich den Ausschnitt: je 5,7 s. Die Diashow endet mit der Musik.",
    );
  });

  it("warns when the slideshow outlasts the excerpt", () => {
    mountEditor(slideshowWith({ trim: { startMs: 0, endMs: 20_000 } }, { count: 12 }));

    expect(document.querySelector(".note.warn")).not.toBeNull();
    expect(text(".note b")).toBe("Die Diashow läuft 0:04 länger als die Musik.");
    expect(document.querySelector(".lane .over")).not.toBeNull();
  });

  it("listens to the start and shows where it plays", () => {
    const { calls, set } = mountEditor(slideshowWith(TRIMMED));

    buttonNamed("Anfang anhören ab 0:12,0").click();
    set({ listening: { kind: "start", positionMs: 14_000 } });

    expect(calls.listens).toEqual(["start"]);
    expect(buttonNamed("Anfang anhören ab 0:12,0").getAttribute("aria-pressed")).toBe("true");
    expect(document.querySelector(".playhead")).not.toBeNull();
  });

  it("stops listening when a handle is grabbed", () => {
    const { calls } = mountEditor(slideshowWith(TRIMMED));

    drag(handle("Ende"), 150_000, 150_000);

    expect(handle("Ende").getAttribute("aria-valuetext")).toBe("2:30,0");
    expect(calls.stops).toBe(1);
    expect(calls.trims).toEqual([]);
  });
});
