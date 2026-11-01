import { afterEach, describe, expect, it } from "vitest";
import { element, mountEditor, press, unmountEditor, view } from "./picture-editor-harness";
import { chip, resetIn, text, tile, timingSection, transitionSection } from "./picture-editor-timing-fixtures";

afterEach(() => unmountEditor());

describe("PictureEditorScreen transition", () => {
  it("offers seven effects, the automatic one checked with a dashed outline and a tag", () => {
    mountEditor();

    const radios = [...transitionSection().querySelectorAll('[role="radio"]')];
    expect(radios.map((radio) => text(radio).replace(/^Auto/, "").trim())).toEqual([
      "Überblenden",
      "Schieben",
      "Wischen",
      "Kreis",
      "Zoom",
      "Auflösen",
      "Harter Schnitt",
    ]);
    expect(element("h3#transition-label").textContent).toBe("Übergang zu Bild 3");
    expect(chip(timingSection())).toBe("Automatisch");
    expect(tile("crossfade").getAttribute("aria-checked")).toBe("true");
    expect(tile("crossfade").classList.contains("automatic")).toBe(true);
    expect(tile("crossfade").querySelector(".tag")?.textContent).toBe("Auto");
    expect(text(transitionSection())).toContain(
      "Automatisch gilt der Übergang der Diashow: Überblenden. Dauert 1,0 s, am Ende von Bild 2: 30 % der Bilddauer, höchstens 1 s.",
    );
  });

  it("while the slideshow alternates, tags the effect for the position and says so", () => {
    mountEditor(
      view({
        transition: {
          ...view().transition,
          choice: "push-left",
          automatic: "push-left",
          slideshowTransition: "alternate",
        },
      }),
    );

    expect(tile("push-left").getAttribute("aria-checked")).toBe("true");
    expect(tile("push-left").querySelector(".tag")?.textContent).toBe("Auto");
    expect(transitionSection().querySelectorAll(".tag")).toHaveLength(1);
    expect(text(transitionSection())).toContain(
      "Automatisch wechseln die Übergänge ab, wie für die Diashow eingestellt.",
    );
  });

  it("tags the slideshow's default effect and names it", () => {
    mountEditor(
      view({
        transition: {
          ...view().transition,
          choice: "zoom-in",
          automatic: "zoom-in",
          slideshowTransition: "zoom-in",
        },
      }),
    );

    expect(tile("zoom-in").querySelector(".tag")?.textContent).toBe("Auto");
    expect(tile("crossfade").querySelector(".tag")).toBeNull();
    expect(text(transitionSection())).toContain("Automatisch gilt der Übergang der Diashow: Zoom.");
  });

  it("makes a tapped effect own, also the automatic one", () => {
    const { calls } = mountEditor();

    tile("circle-open").click();
    tile("crossfade").click();

    expect(calls.transitions).toEqual(["circle-open", "crossfade"]);
  });

  it("moves the choice with the arrow keys", () => {
    const { calls } = mountEditor();
    tile("crossfade").focus();

    press(tile("crossfade"), "ArrowRight");

    expect(calls.transitions).toEqual(["push-left"]);
    expect(document.activeElement).toBe(tile("push-left"));
  });

  it("shows an own cut: no tag, and the next picture follows without a transition", () => {
    mountEditor(
      view({ transition: { ...view().transition, choice: "cut", own: true, durationMs: 0 } }),
    );

    expect(chip(timingSection())).toBe("Eigener Zeitablauf");
    expect(transitionSection().querySelector(".tag")).toBeNull();
    expect(text(transitionSection())).toContain("Bild 3 folgt ohne Übergang.");
    expect(text(transitionSection())).not.toContain("Automatisch gilt");
  });

  it("Back to automatic on an own cut reverts to the automatic transition", () => {
    const { calls } = mountEditor(
      view({ transition: { ...view().transition, choice: "cut", own: true, durationMs: 0 } }),
    );

    resetIn(timingSection()).click();

    expect(chip(timingSection())).toBe("Automatisch");
    expect(tile("crossfade").querySelector(".tag")?.textContent).toBe("Auto");
    expect(calls.timingResets).toBe(1);
  });

  it("at the last picture with an own transition stored, says the slideshow ends and names it", () => {
    mountEditor(
      view({
        number: 3,
        nextId: null,
        next: null,
        transition: { ...view().transition, choice: "dissolve", own: true, durationMs: 0 },
      }),
    );

    expect(text(transitionSection())).toContain("Letztes Bild");
    expect(text(transitionSection())).toContain("Hier endet die Diashow, ohne Übergang.");
    expect(text(transitionSection())).toContain(
      "Der eigene Übergang „Auflösen“ bleibt gespeichert und gilt wieder, sobald ein Bild folgt.",
    );
    expect(transitionSection().querySelector('[role="radio"]')).toBeNull();
  });

  it("at the last picture, Back to automatic drops the stored transition", () => {
    const { calls } = mountEditor(
      view({
        number: 3,
        nextId: null,
        next: null,
        transition: { ...view().transition, choice: "dissolve", own: true, durationMs: 0 },
      }),
    );

    resetIn(timingSection()).click();

    expect(chip(timingSection())).toBe("Automatisch");
    expect(text(transitionSection())).not.toContain("bleibt gespeichert");
    expect(calls.timingResets).toBe(1);
  });
});
