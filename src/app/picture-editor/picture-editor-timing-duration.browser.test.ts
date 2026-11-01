import "../../styles/tokens.css";
import "../../styles/base.css";
import { afterEach, describe, expect, it } from "vitest";
import { element, mountEditor, unmountEditor, view } from "./picture-editor-harness";
import {
  chip,
  dragLength,
  lengthInput,
  lengthSlider,
  lengthValue,
  releaseLength,
  resetIn,
  text,
  timingSection,
} from "./picture-editor-timing-fixtures";

afterEach(() => unmountEditor());

describe("PictureEditorScreen picture length", () => {
  it("is a slider from 2 to 15 s in half-second steps, named and read out in seconds", () => {
    mountEditor();

    const input = lengthInput();
    expect(input.getAttribute("aria-label")).toBe("Bilddauer");
    expect([input.min, input.max, input.step, input.value]).toEqual(["2", "15", "0.5", "5"]);
    expect(input.getAttribute("aria-valuetext")).toBe("5,0 s");
    expect(lengthValue()).toBe("5,0 s");
    const marks = [...element(".slider .scale").children].map((mark) => mark.textContent);
    expect(marks).toEqual(["2 s", "5", "10", "15 s"]);
  });

  it("shows the value live while dragging and stores nothing until release", () => {
    const { calls } = mountEditor();

    dragLength(7.5);

    expect(lengthValue()).toBe("7,5 s");
    expect(lengthInput().getAttribute("aria-valuetext")).toBe("7,5 s");
    expect(calls.durations).toEqual([]);

    releaseLength();

    expect(calls.durations).toEqual([7500]);
  });

  it("marks the automatic duration on the track", () => {
    mountEditor(view({ durationMs: 8000, ownDuration: true }));

    const mark = element(".slider .mark");
    expect(mark.title).toBe("Automatisch: 5,0 s");
  });

  it("has no automatic mark while the automatic duration is shared music", () => {
    mountEditor(
      view({
        durationBasis: { kind: "music", automaticCount: 7, shareMs: null, clamped: false },
      }),
    );

    expect(lengthInput()).toBeDefined();
    expect(lengthSlider().querySelector(".mark")).toBeNull();
  });

  it("calls an automatic timing so: Back to automatic looks off and says why", () => {
    const { calls } = mountEditor();
    const reset = resetIn(timingSection());

    reset.click();

    expect(chip(timingSection())).toBe("Automatisch");
    expect(reset.getAttribute("aria-disabled")).toBe("true");
    expect(reset.title).toBe("Der Zeitablauf ist schon automatisch");
    expect(calls.timingResets).toBe(0);
  });

  it("an own duration alone makes the timing own and names the automatic one", () => {
    mountEditor(view({ durationMs: 8000, ownDuration: true }));

    expect(chip(timingSection())).toBe("Eigener Zeitablauf");
    expect(text(timingSection())).toContain("Automatisch wären es 5,0 s.");
    expect(text(timingSection())).not.toContain("2 bis 15 s.");
  });

  it("Back to automatic resets duration and transition with one press", () => {
    const { calls } = mountEditor(view({ durationMs: 8000, ownDuration: true }));

    resetIn(timingSection()).click();

    expect(calls.timingResets).toBe(1);
    expect(chip(timingSection())).toBe("Automatisch");
    expect(lengthValue()).toBe("5,0 s");
  });

  it("has a single Back to automatic for the whole timing", () => {
    mountEditor();

    const resets = [...timingSection().querySelectorAll("button")].filter((candidate) =>
      candidate.textContent?.includes("Zurück auf automatisch"),
    );
    expect(resets).toHaveLength(1);
  });

  it("with music, names the share of the other pictures", () => {
    mountEditor(
      view({
        durationMs: 8000,
        ownDuration: true,
        durationBasis: { kind: "music", automaticCount: 7, shareMs: 4620, clamped: false },
      }),
    );

    expect(text(timingSection())).toContain(
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

    expect(text(timingSection())).toContain(
      "Die Musik ist aufgebraucht; die übrigen 7 Bilder bekommen das Minimum, je 2,0 s.",
    );
  });
});
