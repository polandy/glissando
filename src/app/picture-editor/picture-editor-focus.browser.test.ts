import { afterEach, describe, expect, it } from "vitest";
import type { FocusBox } from "../../library/picture-focus";
import { element, mountEditor, unmountEditor, view } from "./picture-editor-harness";

afterEach(() => unmountEditor());

const FACE: FocusBox = { x: 0.5, y: 0.25, width: 0.2, height: 0.4 };
const marker = () => document.querySelector<HTMLElement>('[role="img"][aria-label^="Fokus"]');
const focusLine = () => element(".focus-line");

describe("PictureEditorScreen, the focus of the automatic motion", () => {
  it("marks the subject box on the picture, with a per-kind chip", () => {
    mountEditor(
      view({
        focus: { kind: "subject", box: FACE, foundBy: "face" },
        focusLine: { status: "face", ownMotion: false, resultKind: "face" },
      }),
    );

    const shown = marker();
    expect(shown?.getAttribute("aria-label")).toBe("Fokus: Gesicht erkannt");
    expect(shown?.textContent?.trim()).toBe("Gesicht");
    const picture = element(".pic").getBoundingClientRect();
    const box = (shown as HTMLElement).getBoundingClientRect();
    expect(box.left - picture.left).toBeCloseTo(FACE.x * picture.width, 0);
    expect(box.top - picture.top).toBeCloseTo(FACE.y * picture.height, 0);
    expect(box.width).toBeCloseTo(FACE.width * picture.width, 0);
    expect(box.height).toBeCloseTo(FACE.height * picture.height, 0);
    expect(focusLine().textContent?.trim()).toBe(
      "Gesicht erkannt – die Bewegung zielt darauf. Erneut ansehen",
    );
  });

  it("keeps the focus line out of the picture block and ends the motion section with it", () => {
    mountEditor(view());

    expect(element(".well-column").querySelector(".focus-line")).toBeNull();
    const motion = element(".motion");
    expect(motion.lastElementChild).toBe(focusLine());
    expect(focusLine().querySelector("button.action")).not.toBeNull();
  });

  it("says quietly that no subject was found and the motion stays centred", () => {
    mountEditor(
      view({
        focus: { kind: "none" },
        focusLine: { status: "none", ownMotion: false, resultKind: "none" },
      }),
    );

    expect(focusLine().textContent?.trim()).toBe(
      "Kein Motiv erkannt – die Bewegung bleibt mittig. Erneut ansehen",
    );
    expect(marker()).toBeNull();
  });

  it("shows a calm pending chip while the focus is being searched for", () => {
    mountEditor(
      view({
        focus: { kind: "searching" },
        focusLine: { status: "looking", ownMotion: false, resultKind: null },
      }),
    );

    expect(element('.focus-line [role="status"]').textContent?.trim()).toBe("Fokus wird gesucht …");
    expect(marker()).toBeNull();
  });

  it("offers to look at a picture not yet looked at", () => {
    mountEditor(
      view({
        focus: { kind: "not-looked-at" },
        focusLine: { status: "waiting", ownMotion: false, resultKind: null },
      }),
    );

    expect(element(".pic")).not.toBeNull();
    expect(focusLine().textContent?.trim()).toBe(
      "Noch nicht angesehen – wartet in der Warteschlange. Jetzt ansehen",
    );
    expect(marker()).toBeNull();
  });

  it("hides the marker while the picture has its own motion and brings it back with the automatic one", () => {
    const automatic = view({ focus: { kind: "subject", box: FACE, foundBy: "face" } });
    const { update } = mountEditor(automatic);

    update({ ...automatic, ownMotion: true });
    expect(element(".frame.active")).not.toBeNull();
    expect(marker()).toBeNull();

    update(automatic);
    expect(marker()).not.toBeNull();
  });

  it("settles the marker in when the focus is found while the picture is open", () => {
    const searching = view({ focus: { kind: "searching" } });
    const { update } = mountEditor(searching);

    update({ ...searching, focus: { kind: "subject", box: FACE, foundBy: "face" } });

    expect(marker()?.getAnimations()).not.toEqual([]);
  });

  it("shows a focus already known at once, without settling in", () => {
    mountEditor(view({ focus: { kind: "subject", box: FACE, foundBy: "face" } }));

    const shown = marker();
    expect(shown).not.toBeNull();
    expect(shown?.getAnimations()).toEqual([]);
  });

  it("brings the marker back at once when the automatic motion returns", () => {
    const searching = view({ focus: { kind: "searching" } });
    const found = {
      ...searching,
      focus: { kind: "subject", box: FACE, foundBy: "face" },
    } as const;
    const { update } = mountEditor(searching);
    update(found);
    update({ ...found, ownMotion: true });

    update(found);

    const shown = marker();
    expect(shown).not.toBeNull();
    expect(shown?.getAnimations()).toEqual([]);
  });
});
