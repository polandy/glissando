import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { button, element, mountEditor, unmountEditor, view } from "./picture-editor-harness";
import { text, tile } from "./picture-editor-timing-fixtures";

afterEach(() => unmountEditor());

describe("PictureEditorScreen preview of the timing", () => {
  const layers = () => element(".preview").querySelectorAll(".layer").length;
  const time = () => element(".preview-time").textContent;

  it("names what plays and marks the transition's zone at the end of the track", () => {
    mountEditor();

    expect(text(element(".preview-line"))).toBe(
      "Bild 2 · 5,0 s, darin Überblenden 1,0 s zu Bild 3",
    );
    expect(element(".transition-zone").style.width).toBe("20%");
  });

  it("shows this picture alone, then both during the transition, then the next", () => {
    const { advance } = mountEditor();
    advance(3000);
    expect(layers()).toBe(1);

    advance(1500);
    expect(layers()).toBe(2);

    advance(1000);
    expect(layers()).toBe(1);
    expect(time()).toBe("0:05,0 / 0:05,0");
  });

  it("at the last picture, ends on the end card", () => {
    const { advance } = mountEditor(view({ number: 3, nextId: null, next: null }));

    advance(5200);

    expect(text(element(".preview-line"))).toBe("Bild 3 · 5,0 s, dann endet die Diashow");
    expect(element(".end-card").textContent).toBe("Ende der Diashow");
    expect(layers()).toBe(0);
  });

  it("plays a new duration from the start", () => {
    const { advance, update } = mountEditor();
    advance(3000);

    update(view({ durationMs: 3000, ownDuration: true }));

    expect(time()).toBe("0:00,0 / 0:03,0");
    advance(3500);
    expect(time()).toBe("0:03,0 / 0:03,0");
  });

  it("plays a picked transition from a moment before it", () => {
    mountEditor();

    tile("dissolve").click();
    flushSync();

    expect(time()).toBe("0:02,8 / 0:05,0");
    expect(button("Vorschau anhalten")).toBeDefined();
  });

  it("with reduced motion, rests half-way through a picked transition", () => {
    const { frames } = mountEditor(view(), { reducedMotion: true });

    tile("crossfade").click();
    flushSync();

    expect(time()).toBe("0:04,5 / 0:05,0");
    expect(layers()).toBe(2);
    expect(frames.hasPendingFrame).toBe(false);
  });

  it("from a cut, with reduced motion, picking an effect rests half-way through it", () => {
    mountEditor(
      view({ transition: { ...view().transition, choice: "cut", own: true, durationMs: 0 } }),
      { reducedMotion: true },
    );

    tile("crossfade").click();
    flushSync();

    expect(time()).toBe("0:04,5 / 0:05,0");
    expect(layers()).toBe(2);
  });
});
