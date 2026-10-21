import { describe, expect, it } from "vitest";
import { DocumentFormatError } from "../glissando-file/document-values";
import { readStoredFocus } from "./read-stored-focus";

const PATH = "focus";

const SUBJECT_BOX = { x: 0.1, y: 0.2, width: 0.3, height: 0.4 };

describe("readStoredFocus", () => {
  it("reads a subject found by a face, with its box and detector", () => {
    const value = {
      focus: { kind: "subject", box: SUBJECT_BOX, foundBy: "face" },
      detector: 2,
    };
    expect(readStoredFocus(value, PATH)).toEqual(value);
  });

  it("reads scenery", () => {
    const value = { focus: { kind: "scenery" }, detector: 3 };
    expect(readStoredFocus(value, PATH)).toEqual(value);
  });

  it("reads none", () => {
    const value = { focus: { kind: "none" }, detector: 1 };
    expect(readStoredFocus(value, PATH)).toEqual(value);
  });

  it("accepts a box touching the picture's right and bottom edge", () => {
    const value = {
      focus: { kind: "subject", box: { x: 0.5, y: 0.5, width: 0.5, height: 0.5 }, foundBy: "object" },
      detector: 1,
    };
    expect(readStoredFocus(value, PATH)).toEqual(value);
  });

  it.each([
    ["not an object", 42],
    ["null", null],
    ["an array", []],
    ["missing focus", { detector: 1 }],
    ["missing detector", { focus: { kind: "none" } }],
    ["an unknown top-level key", { focus: { kind: "none" }, detector: 1, extra: true }],
    ["a detector of zero", { focus: { kind: "none" }, detector: 0 }],
    ["a negative detector", { focus: { kind: "none" }, detector: -1 }],
    ["a non-integer detector", { focus: { kind: "none" }, detector: 1.5 }],
    ["a detector that is not a number", { focus: { kind: "none" }, detector: "1" }],
    ["an unknown focus kind", { focus: { kind: "maybe" }, detector: 1 }],
    ["a focus missing its kind", { focus: {}, detector: 1 }],
    ["an unknown key inside focus", { focus: { kind: "none", extra: true }, detector: 1 }],
    [
      "a box on scenery",
      { focus: { kind: "scenery", box: SUBJECT_BOX }, detector: 1 },
    ],
    [
      "a foundBy on scenery",
      { focus: { kind: "scenery", foundBy: "face" }, detector: 1 },
    ],
    [
      "a box on none",
      { focus: { kind: "none", box: SUBJECT_BOX }, detector: 1 },
    ],
    [
      "a foundBy on none",
      { focus: { kind: "none", foundBy: "object" }, detector: 1 },
    ],
    [
      "a subject missing its box",
      { focus: { kind: "subject", foundBy: "face" }, detector: 1 },
    ],
    [
      "a subject missing its foundBy",
      { focus: { kind: "subject", box: SUBJECT_BOX }, detector: 1 },
    ],
    [
      "a foundBy outside SUBJECT_FINDERS",
      { focus: { kind: "subject", box: SUBJECT_BOX, foundBy: "guess" }, detector: 1 },
    ],
    [
      "a box with an unknown key",
      {
        focus: { kind: "subject", box: { ...SUBJECT_BOX, depth: 1 }, foundBy: "face" },
        detector: 1,
      },
    ],
    [
      "a box missing its width",
      {
        focus: { kind: "subject", box: { x: 0.1, y: 0.1, height: 0.2 }, foundBy: "face" },
        detector: 1,
      },
    ],
    [
      "a box x below 0",
      {
        focus: {
          kind: "subject",
          box: { ...SUBJECT_BOX, x: -0.1 },
          foundBy: "face",
        },
        detector: 1,
      },
    ],
    [
      "a box x above 1",
      { focus: { kind: "subject", box: { ...SUBJECT_BOX, x: 1.1 }, foundBy: "face" }, detector: 1 },
    ],
    [
      "a box width of zero",
      {
        focus: { kind: "subject", box: { ...SUBJECT_BOX, width: 0 }, foundBy: "face" },
        detector: 1,
      },
    ],
    [
      "a box height of zero",
      {
        focus: { kind: "subject", box: { ...SUBJECT_BOX, height: 0 }, foundBy: "face" },
        detector: 1,
      },
    ],
    [
      "a box an infinite width",
      {
        focus: {
          kind: "subject",
          box: { ...SUBJECT_BOX, width: Number.POSITIVE_INFINITY },
          foundBy: "face",
        },
        detector: 1,
      },
    ],
    [
      "a box a NaN y",
      {
        focus: { kind: "subject", box: { ...SUBJECT_BOX, y: Number.NaN }, foundBy: "face" },
        detector: 1,
      },
    ],
    [
      "a box whose x + width passes 1",
      {
        focus: {
          kind: "subject",
          box: { x: 0.6, y: 0.1, width: 0.5, height: 0.1 },
          foundBy: "face",
        },
        detector: 1,
      },
    ],
    [
      "a box whose y + height passes 1",
      {
        focus: {
          kind: "subject",
          box: { x: 0.1, y: 0.6, width: 0.1, height: 0.5 },
          foundBy: "face",
        },
        detector: 1,
      },
    ],
  ])("rejects %s", (_name, value) => {
    expect(() => readStoredFocus(value, PATH)).toThrow(DocumentFormatError);
  });

  it("names the path and the bad value in its error", () => {
    expect(() => readStoredFocus({ focus: { kind: "none" }, detector: 0 }, "slideshows[0]")).toThrow(
      /slideshows\[0\]\.detector/,
    );
  });
});
