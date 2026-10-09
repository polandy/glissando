import { afterEach, describe, expect, it } from "vitest";
import type { FocusBox } from "../../library/picture-focus";
import { element, mountEditor, unmountEditor, view } from "./picture-editor-harness";

afterEach(() => unmountEditor());

const FACE: FocusBox = { x: 0.5, y: 0.25, width: 0.2, height: 0.4 };
const marker = () => document.querySelector<HTMLElement>('[role="img"][aria-label^="Fokus"]');
const focusLine = () => element(".focus-line");

describe("PictureEditorScreen, the focus of the automatic motion", () => {
  it("marks the subject box on the picture, with a Fokus chip", () => {
    mountEditor(view({ focus: { kind: "subject", box: FACE } }));

    const shown = marker();
    expect(shown?.getAttribute("aria-label")).toBe("Fokus: Gesicht erkannt");
    expect(shown?.textContent?.trim()).toBe("Fokus");
    const picture = element(".pic").getBoundingClientRect();
    const box = (shown as HTMLElement).getBoundingClientRect();
    expect(box.left - picture.left).toBeCloseTo(FACE.x * picture.width, 0);
    expect(box.top - picture.top).toBeCloseTo(FACE.y * picture.height, 0);
    expect(box.width).toBeCloseTo(FACE.width * picture.width, 0);
    expect(box.height).toBeCloseTo(FACE.height * picture.height, 0);
    expect(focusLine().textContent?.trim()).toBe("");
  });

  it("says quietly that no subject was found and the motion stays centred", () => {
    mountEditor(view({ focus: { kind: "none" } }));

    expect(focusLine().textContent?.trim()).toBe(
      "Kein Motiv erkannt – die Bewegung bleibt mittig.",
    );
    expect(marker()).toBeNull();
  });

  it("shows a calm pending chip while the focus is being searched for", () => {
    mountEditor(view({ focus: { kind: "searching" } }));

    expect(element('.focus-line [role="status"]').textContent?.trim()).toBe("Fokus wird gesucht …");
    expect(marker()).toBeNull();
  });

  it("shows nothing of the focus for a picture not looked at", () => {
    mountEditor(view({ focus: { kind: "not-looked-at" } }));

    expect(element(".pic")).not.toBeNull();
    expect(focusLine().textContent?.trim()).toBe("");
    expect(marker()).toBeNull();
  });

  it("hides the marker while the picture has its own motion and brings it back with the automatic one", () => {
    const automatic = view({ focus: { kind: "subject", box: FACE } });
    const { update } = mountEditor(automatic);

    update({ ...automatic, ownMotion: true });
    expect(element(".frame.active")).not.toBeNull();
    expect(marker()).toBeNull();

    update(automatic);
    expect(marker()).not.toBeNull();
  });
});
