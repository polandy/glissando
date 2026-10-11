import { afterEach, describe, expect, it } from "vitest";
import type { MusicBeats } from "../../beats";
import type { BeatsStatus } from "../beats/music-beats-known";
import { mountEditor, slideshowWith, text, TRACK_MS, unmountEditor } from "./music-editor-harness";

afterEach(() => unmountEditor());

/** A beat every 500 ms (120 BPM) across the whole track. */
const STEADY: MusicBeats = {
  kind: "beats",
  beatsMs: Array.from({ length: TRACK_MS / 500 }, (_, beat) => 250 + beat * 500),
  beatsPerMinute: 120.2,
};
const FOUND: BeatsStatus = { kind: "known", beats: STEADY };
const EVEN = { pictureChanges: "even" } as const;

const section = (): HTMLElement => {
  const found = document.querySelector<HTMLElement>('[aria-labelledby="music-picture-changes"]');
  if (found === null) throw new Error("no picture changes section");
  return found;
};
const radio = (name: string): HTMLButtonElement => {
  const found = [...section().querySelectorAll<HTMLButtonElement>('[role="radio"]')].find(
    (button) => button.textContent?.trim() === name,
  );
  if (found === undefined) throw new Error(`no radio "${name}"`);
  return found;
};
const checked = () => section().querySelector('[aria-checked="true"]')?.textContent?.trim();
const ticks = () => document.querySelectorAll(".beat-ticks i");

describe("MusicEditorScreen, the picture changes", () => {
  it("says it listens for the beat, with no choice and no ticks, until the beats are known", () => {
    mountEditor(slideshowWith(), { kind: "listening" });

    expect(text('[aria-labelledby="music-picture-changes"]')).toContain(
      "Glissando hört den Takt heraus",
    );
    expect(section().querySelector('[role="radiogroup"]')).toBeNull();
    expect(ticks()).toHaveLength(0);
  });

  it("with a beat found, shows the tempo and the pictures on the beat, ticking the beats", () => {
    mountEditor(slideshowWith(), FOUND);

    expect(section().textContent).toContain("120 BPM");
    expect(checked()).toBe("Im Takt");
    expect(section().textContent).toContain("Jeder automatische Wechsel landet auf einem Schlag");
    expect(ticks()).toHaveLength(STEADY.beatsMs.length);
    expect(document.querySelectorAll(".beat-ticks i.bar")).toHaveLength(STEADY.beatsMs.length / 4);
  });

  it("stores even picture changes, and back on the beat, without ticks while even", () => {
    const { calls, set } = mountEditor(slideshowWith(), FOUND);

    radio("Gleichmäßig").click();
    set({ slideshow: slideshowWith(EVEN) });

    expect(checked()).toBe("Gleichmäßig");
    expect(section().textContent).toContain("unabhängig von ihrem Takt");
    expect(ticks()).toHaveLength(0);

    radio("Im Takt").click();
    expect(calls.pictureChanges).toEqual(["even", undefined]);
  });

  it("moves between the two choices with the arrow keys", () => {
    const { calls } = mountEditor(slideshowWith(), FOUND);

    radio("Im Takt").dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );

    expect(calls.pictureChanges).toEqual(["even"]);
    expect(document.activeElement).toBe(radio("Gleichmäßig"));
  });

  it("names the pictures with an own duration and marks only the change after each off the beat", () => {
    mountEditor(slideshowWith({}, { count: 6, durations: { 1: 7300, 4: 9100 } }), FOUND);

    expect(section().textContent).toContain(
      "Die Bilder 2 und 5 behalten ihre eigene Dauer, darum kann der Wechsel nach jedem zwischen die Schläge fallen.",
    );
    expect(document.querySelectorAll(".runs i").length).toBe(5);
    // Off the beat by 300 and 100 ms once the change before each lands on one.
    expect(document.querySelectorAll(".runs i.off-beat").length).toBe(2);
  });

  it("names the shares as approximate while the pictures change on the beat, exact when even", () => {
    const { set } = mountEditor(slideshowWith({}, { count: 4 }), FOUND);

    expect(text(".note")).toContain("teilen sich den Ausschnitt: je etwa ");

    set({ slideshow: slideshowWith(EVEN, { count: 4 }) });
    expect(text(".note")).toContain("teilen sich den Ausschnitt: je ");
    expect(text(".note")).not.toContain("etwa");
  });

  it("says when the music has no steady beat, offering no choice", () => {
    mountEditor(slideshowWith(), { kind: "known", beats: { kind: "none" } });

    expect(section().textContent).toContain("In dieser Musik ist kein gleichmäßiger Takt");
    expect(section().querySelector('[role="radiogroup"]')).toBeNull();
    expect(ticks()).toHaveLength(0);
  });
});
