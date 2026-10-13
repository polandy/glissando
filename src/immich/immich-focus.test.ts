import { describe, expect, it } from "vitest";
import facesGroup from "./fixtures/faces-group.json";
import facesNone from "./fixtures/faces-none.json";
import facesOne from "./fixtures/faces-one.json";
import facesRotated from "./fixtures/faces-rotated.json";
import type { ImmichFace } from "./immich-client";
import { focusFromFaces } from "./immich-focus";

interface RecordedFace {
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly boundingBoxX1: number;
  readonly boundingBoxY1: number;
  readonly boundingBoxX2: number;
  readonly boundingBoxY2: number;
}

const recorded = (faces: readonly RecordedFace[]): ImmichFace[] =>
  faces.map((face) => ({
    imageWidth: face.imageWidth,
    imageHeight: face.imageHeight,
    x1: face.boundingBoxX1,
    y1: face.boundingBoxY1,
    x2: face.boundingBoxX2,
    y2: face.boundingBoxY2,
  }));

const face = (x1: number, y1: number, x2: number, y2: number): ImmichFace => ({
  imageWidth: 100,
  imageHeight: 50,
  x1,
  y1,
  x2,
  y2,
});

describe("focusFromFaces", () => {
  it.each([
    {
      name: "a recorded single face, divided by its image size",
      faces: recorded(facesOne),
      box: { x: 329 / 1280, y: 242 / 1649, width: 516 / 1280, height: 788 / 1649 },
    },
    {
      name: "all three faces of a recorded group as one box",
      faces: recorded(facesGroup),
      box: { x: 60 / 1280, y: 441 / 926, width: 150 / 1280, height: 92 / 926 },
    },
    {
      name: "a recorded EXIF-rotated photo, in display orientation",
      faces: recorded(facesRotated),
      box: { x: 148 / 520, y: 137 / 671, width: 221 / 520, height: 312 / 671 },
    },
    {
      name: "the larger by area, not by width, leaving out a much smaller face",
      faces: [face(0, 0, 40, 1), face(50, 10, 70, 40)],
      box: { x: 0.5, y: 0.2, width: 0.2, height: 0.6 },
    },
    {
      name: "two faces of similar size as one group",
      faces: [face(10, 10, 30, 30), face(60, 15, 80, 35)],
      box: { x: 0.1, y: 0.2, width: 0.7, height: 0.5 },
    },
    {
      name: "a face in the background left out of the group",
      faces: [face(10, 10, 30, 30), face(60, 15, 80, 35), face(90, 40, 93, 43)],
      box: { x: 0.1, y: 0.2, width: 0.7, height: 0.5 },
    },
    {
      name: "a box reaching past the image, clamped inside it",
      faces: [face(-10, -5, 110, 60)],
      box: { x: 0, y: 0, width: 1, height: 1 },
    },
    {
      name: "a box reaching past the right and bottom edge, clamped there",
      faces: [face(80, 40, 120, 70)],
      box: { x: 0.8, y: 0.8, width: 0.2, height: 0.2 },
    },
  ])("aims at $name", ({ faces, box }) => {
    const focus = focusFromFaces(faces);

    expect(focus?.kind).toBe("subject");
    if (focus?.kind !== "subject") return;
    expect(focus.box.x).toBeCloseTo(box.x);
    expect(focus.box.y).toBeCloseTo(box.y);
    expect(focus.box.width).toBeCloseTo(box.width);
    expect(focus.box.height).toBeCloseTo(box.height);
  });

  it("finds nothing to aim at in a recorded photo without faces, which may be not scanned yet", () => {
    expect(focusFromFaces(recorded(facesNone))).toBeNull();
  });
});
