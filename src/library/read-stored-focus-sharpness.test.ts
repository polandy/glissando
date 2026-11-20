import { describe, expect, it } from "vitest";
import { DocumentFormatError } from "../glissando-file/document-values";
import { readStoredFocus } from "./read-stored-focus";

const PATH = "focus";
const SUBJECT_BOX = { x: 0.1, y: 0.2, width: 0.3, height: 0.4 };

describe("readStoredFocus with the measured sharpness", () => {
  it.each([
    { kind: "subject", box: SUBJECT_BOX, foundBy: "object", sharpness: 812.5 },
    { kind: "scenery", sharpness: 40 },
    { kind: "none", sharpness: 0 },
  ])("reads the sharpness of a %o", (focus) => {
    const value = { focus, detector: 4 };
    expect(readStoredFocus(value, PATH)).toEqual(value);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, "120", null])(
    "rejects a sharpness of %s",
    (sharpness) => {
      const value = { focus: { kind: "none", sharpness }, detector: 4 };
      expect(() => readStoredFocus(value, PATH)).toThrow(DocumentFormatError);
    },
  );

  it("names the sharpness's path in its error", () => {
    const value = { focus: { kind: "scenery", sharpness: -2 }, detector: 4 };
    expect(() => readStoredFocus(value, PATH)).toThrow(/focus\.focus\.sharpness/);
  });
});
