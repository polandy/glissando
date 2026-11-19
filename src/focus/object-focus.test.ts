import { describe, expect, it } from "vitest";
import { decodeObjects, objectFocus, type ObjectDetection, type RgbaImage } from "./object-focus";
import type { Tensor } from "./onnx/tensor-ops";
import { CAT, cellAt, networkOutput as outputWith } from "./testing/object-network-output";

const CAR = 2;
const PERSON = 0;
const LAST_CLASS = 79;
const NETWORK_INPUT = 416;
const PADDING_GREY = 114;

function filled(
  width: number,
  height: number,
  [red, green, blue]: readonly [number, number, number],
): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel++) data.set([red, green, blue, 255], pixel * 4);
  return { width, height, data };
}

// Float32 output: whole pixels, the rounding noise dropped.
const sizeOf = (object: ObjectDetection | undefined): number[] => {
  if (!object) throw new Error("expected a detection");
  return [object.centreX, object.centreY, object.width, object.height].map(Math.round);
};

describe("objectFocus", () => {
  it("hands the network the picture letterboxed: a square, blue first, padded with grey", () => {
    const inputs: Tensor[] = [];
    const red = filled(NETWORK_INPUT / 2, NETWORK_INPUT / 4, [255, 0, 0]);

    objectFocus(red, (input) => {
      inputs.push(input);
      return outputWith([]);
    });

    const [input] = inputs;
    if (!input) throw new Error("expected the network to run");
    const plane = NETWORK_INPUT * NETWORK_INPUT;
    const bottomLeft = (NETWORK_INPUT - 1) * NETWORK_INPUT;
    expect({
      dims: input.dims,
      blueAndRedAtTheTopLeft: [input.data[0], input.data[2 * plane]],
      redBelowThePicture: input.data[2 * plane + bottomLeft],
    }).toEqual({
      dims: [1, 3, NETWORK_INPUT, NETWORK_INPUT],
      blueAndRedAtTheTopLeft: [0, 255],
      redBelowThePicture: PADDING_GREY,
    });
  });

  it("aims at the object the network finds, in picture coordinates", () => {
    const picture = filled(NETWORK_INPUT, NETWORK_INPUT, [128, 128, 128]);
    const output = outputWith([
      { cell: cellAt(26, 26), box: [0, 0, 208, 208], objectness: 1, classId: CAT, score: 1 },
    ]);

    expect(objectFocus(picture, () => output)).toEqual({
      kind: "subject",
      box: {
        x: expect.closeTo(0.25, 6),
        y: expect.closeTo(0.25, 6),
        width: expect.closeTo(0.5, 6),
        height: expect.closeTo(0.5, 6),
      },
      foundBy: "object",
    });
  });

  it("finds nothing to aim at when the network finds no object", () => {
    expect(objectFocus(filled(160, 120, [128, 128, 128]), () => outputWith([]))).toEqual({
      kind: "none",
    });
  });
});

describe("decodeObjects", () => {
  const WHOLE = { ratio: 1 };

  it("places a box at its grid cell and size, in picture pixels", () => {
    const output = outputWith([
      { cell: cellAt(10, 20), box: [0.5, 0.5, 64, 32], objectness: 0.9, classId: CAT, score: 0.9 },
    ]);

    const [object] = decodeObjects(output, WHOLE);

    expect(sizeOf(object)).toEqual([84, 164, 64, 32]);
  });

  it("scales the box back by the letterbox ratio", () => {
    const output = outputWith([
      { cell: cellAt(10, 20), box: [0, 0, 64, 32], objectness: 1, classId: CAT, score: 1 },
    ]);

    const [object] = decodeObjects(output, { ...WHOLE, ratio: 0.5 });

    expect(sizeOf(object)).toEqual([160, 320, 128, 64]);
  });

  it.each([
    ["a person", PERSON],
    ["a car", CAR],
    ["a cat", CAT],
    ["an object of the last class", LAST_CLASS],
  ])("finds %s", (_name, classId) => {
    const output = outputWith([
      { cell: cellAt(5, 5), box: [0, 0, 40, 40], objectness: 1, classId, score: 1 },
    ]);

    expect(decodeObjects(output, WHOLE).map((object) => object.centreX)).toEqual([40]);
  });

  it("drops weak detections", () => {
    const output = outputWith([
      { cell: cellAt(5, 5), box: [0, 0, 40, 40], objectness: 0.5, classId: CAT, score: 0.5 },
    ]);

    expect(decodeObjects(output, WHOLE)).toEqual([]);
  });

  it("keeps only the best of detections on top of each other", () => {
    const output = outputWith([
      { cell: cellAt(10, 10), box: [0, 0, 64, 64], objectness: 0.8, classId: CAT, score: 0.8 },
      { cell: cellAt(11, 10), box: [0, 0, 64, 64], objectness: 0.9, classId: CAT, score: 0.9 },
    ]);

    expect(decodeObjects(output, WHOLE)).toHaveLength(1);
    expect(decodeObjects(output, WHOLE)[0]?.score).toBeCloseTo(0.81, 5);
  });
});
