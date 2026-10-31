import { afterEach, describe, expect, it } from "vitest";
import { button, element, mountEditor, unmountEditor, view } from "./picture-editor-harness";
import { chip, durationSection, resetIn, text } from "./picture-editor-timing-fixtures";

afterEach(() => unmountEditor());

describe("PictureEditorScreen duration", () => {
  it("shows an automatic duration with its value; + makes it own, half a second longer", () => {
    const { calls } = mountEditor();

    button("Eine halbe Sekunde länger").click();

    expect(chip(durationSection())).toBe("Automatisch");
    expect(element("output").textContent).toBe("5,0 s");
    expect(text(durationSection())).toContain("Folgt der Bilddauer der Diashow. 2 bis 15 s.");
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
    expect(text(durationSection())).toContain("Automatisch wären es 5,0 s.");
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
