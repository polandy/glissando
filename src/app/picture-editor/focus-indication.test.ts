import { describe, expect, it } from "vitest";
import type { FocusBox } from "../../library/picture-focus";
import { focusIndication } from "./focus-indication";

const FACE: FocusBox = { x: 0.6, y: 0.4, width: 0.12, height: 0.16 };

describe("focusIndication", () => {
  it("marks the subject box of an automatic motion, its chip above and from the box's left", () => {
    expect(focusIndication({ kind: "subject", box: FACE }, false)).toEqual({
      kind: "marker",
      box: FACE,
      chip: { below: false, alignRight: false },
    });
  });

  it("puts the chip below a box too near the picture's top for it to fit above", () => {
    const high = { ...FACE, y: 0.05 };

    expect(focusIndication({ kind: "subject", box: high }, false)).toMatchObject({
      chip: { below: true, alignRight: false },
    });
  });

  it("aligns the chip to the right of a box reaching close to the picture's right edge", () => {
    const right = { ...FACE, x: 0.75 };

    expect(focusIndication({ kind: "subject", box: right }, false)).toMatchObject({
      chip: { below: false, alignRight: true },
    });
  });

  it("notes that no subject was found, and that one is being searched for", () => {
    expect(focusIndication({ kind: "none" }, false)).toEqual({ kind: "no-subject" });
    expect(focusIndication({ kind: "searching" }, false)).toEqual({ kind: "searching" });
  });

  it("shows nothing for a picture not looked at", () => {
    expect(focusIndication({ kind: "not-looked-at" }, false)).toEqual({ kind: "nothing" });
  });

  it("shows nothing of the focus while the picture has its own motion", () => {
    expect(focusIndication({ kind: "subject", box: FACE }, true)).toEqual({ kind: "nothing" });
    expect(focusIndication({ kind: "none" }, true)).toEqual({ kind: "nothing" });
    expect(focusIndication({ kind: "searching" }, true)).toEqual({ kind: "nothing" });
  });
});
