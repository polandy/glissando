import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { button, element, mountEditor, press, unmountEditor, view } from "./picture-editor-harness";

afterEach(() => unmountEditor());

const section = (label: string) => element(`section[aria-labelledby="${label}"]`);
const durationSection = () => section("duration-label");
const transitionSection = () => section("transition-label");
/** The text as read, whitespace between elements collapsed. */
const text = (within: Element) => within.textContent?.replace(/\s+/g, " ").trim() ?? "";
const chip = (within: HTMLElement) => within.querySelector(".state")?.textContent?.trim();
const tile = (choice: string) =>
  element<HTMLButtonElement>(`[role="radio"][data-choice="${choice}"]`);
const resetIn = (within: HTMLElement) =>
  [...within.querySelectorAll("button")].find((candidate) =>
    candidate.textContent?.includes("Zurück auf automatisch"),
  ) as HTMLButtonElement;

describe("PictureEditorScreen duration", () => {
  it("shows an automatic duration with its value; + makes it own, half a second longer", () => {
    const { calls } = mountEditor();

    button("Eine halbe Sekunde länger").click();

    expect(chip(durationSection())).toBe("Automatisch");
    expect(element("output").textContent).toBe("5,0 s");
    expect(text(durationSection())).toContain(
      "Die Sekunden pro Bild dieser Diashow. Mit + und − wird es eine eigene Dauer. 2 bis 15 s.",
    );
    expect(calls.durations).toEqual([5500]);
  });

  it("calls an automatic duration so: Back to automatic looks off and says why", () => {
    const { calls } = mountEditor();
    const reset = resetIn(durationSection());

    reset.click();

    expect(reset.getAttribute("aria-disabled")).toBe("true");
    expect(reset.title).toBe("Die Dauer ist schon automatisch");
    expect(calls.durationResets).toBe(0);
  });

  it("shows an own duration beside the automatic one; Back to automatic resets it", () => {
    const { calls } = mountEditor(view({ durationMs: 8000, ownDuration: true }));

    resetIn(durationSection()).click();

    expect(chip(durationSection())).toBe("Eigene Dauer");
    expect(text(durationSection())).toContain(
      "Automatisch wären es 5,0 s, die Sekunden pro Bild dieser Diashow.",
    );
    expect(calls.durationResets).toBe(1);
  });

  it("looks off at the longest duration and stays there", () => {
    const { calls } = mountEditor(view({ durationMs: 15_000, ownDuration: true }));
    const longer = button("Eine halbe Sekunde länger");

    longer.click();
    button("Eine halbe Sekunde kürzer").click();

    expect(longer.getAttribute("aria-disabled")).toBe("true");
    expect(calls.durations).toEqual([14_500]);
  });

  it("with music, names the share of the other pictures", () => {
    mountEditor(
      view({
        durationMs: 8000,
        ownDuration: true,
        durationBasis: { kind: "music", automaticCount: 7, shareMs: 4620, clamped: false },
      }),
    );

    expect(text(durationSection())).toContain(
      "Die übrigen 7 Bilder teilen sich den Rest der Musik: je 4,6 s.",
    );
  });

  it("with music used up by own durations, says the others get the minimum", () => {
    mountEditor(
      view({
        durationMs: 8000,
        ownDuration: true,
        durationBasis: { kind: "music", automaticCount: 7, shareMs: 2000, clamped: true },
      }),
    );

    expect(text(durationSection())).toContain(
      "Die Musik ist aufgebraucht; die übrigen 7 Bilder bekommen das Minimum, je 2,0 s.",
    );
  });
});

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
      "Schnitt",
    ]);
    expect(element(".eyebrow#transition-label").textContent).toBe("Übergang zu Bild 3");
    expect(chip(transitionSection())).toBe("Automatisch");
    expect(tile("push-left").getAttribute("aria-checked")).toBe("true");
    expect(tile("push-left").classList.contains("automatic")).toBe(true);
    expect(tile("push-left").querySelector(".tag")?.textContent).toBe("Auto");
    expect(text(transitionSection())).toContain(
      "Automatisch wechseln die Übergänge von Bild zu Bild ab. Dauert 1,0 s, am Ende von Bild 2: 30 % der Bildzeit, höchstens 1 s.",
    );
  });

  it("makes a tapped effect own, also the automatic one", () => {
    const { calls } = mountEditor();

    tile("circle-open").click();
    tile("push-left").click();

    expect(calls.transitions).toEqual(["circle-open", "push-left"]);
  });

  it("moves the choice with the arrow keys", () => {
    const { calls } = mountEditor();
    tile("push-left").focus();

    press(tile("push-left"), "ArrowRight");

    expect(calls.transitions).toEqual(["wipe-right"]);
    expect(document.activeElement).toBe(tile("wipe-right"));
  });

  it("shows an own cut: no tag, and the next picture follows without a transition", () => {
    const { calls } = mountEditor(
      view({ transition: { choice: "cut", own: true, automatic: "push-left", durationMs: 0 } }),
    );

    resetIn(transitionSection()).click();

    expect(chip(transitionSection())).toBe("Eigener Übergang");
    expect(transitionSection().querySelector(".tag")).toBeNull();
    expect(text(transitionSection())).toContain("Bild 3 folgt ohne Übergang.");
    expect(text(transitionSection())).not.toContain("Automatisch wechseln");
    expect(calls.transitionResets).toBe(1);
  });

  it("at the last picture, says the slideshow ends and keeps a stored transition", () => {
    const { calls } = mountEditor(
      view({
        number: 3,
        nextId: null,
        next: null,
        transition: { choice: "dissolve", own: true, automatic: "wipe-right", durationMs: 0 },
      }),
    );

    resetIn(transitionSection()).click();

    expect(chip(transitionSection())).toBe("Letztes Bild");
    expect(text(transitionSection())).toContain("Hier endet die Diashow, ohne Übergang.");
    expect(text(transitionSection())).toContain(
      "Der eigene Übergang „Auflösen“ bleibt gespeichert und gilt wieder, sobald ein Bild folgt.",
    );
    expect(transitionSection().querySelector('[role="radio"]')).toBeNull();
    expect(calls.transitionResets).toBe(1);
  });
});

describe("PictureEditorScreen preview of the timing", () => {
  const layers = () => element(".preview").querySelectorAll(".layer").length;
  const time = () => element(".preview-time").textContent;

  it("names what plays and marks the transition's zone at the end of the track", () => {
    mountEditor();

    expect(text(element(".preview-line"))).toBe("Bild 2 · 5,0 s, darin Schieben 1,0 s zu Bild 3");
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
});
