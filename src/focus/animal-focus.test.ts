import { beforeAll, describe, expect, it } from "vitest";
import { animalFocus, decodeAnimals, type AnimalDetection, type RgbaImage } from "./animal-focus";
import modelDataUrl from "./yolox-nano.bin?url&inline";
import { item } from "./onnx/item";
import type { OnnxGraph } from "./onnx/onnx-model";
import { parseOnnx } from "./onnx/onnx-model";
import type { Tensor } from "./onnx/tensor-ops";
import chelseaPpmDataUrl from "./testing/chelsea-160.ppm?url&inline";

/**
 * chelsea-160.ppm: Chelsea the cat, scikit-image's CC0 test picture (skimage/data/chelsea.png),
 * scaled to 160 × 106. The cat fills the picture, its head a little left of the middle.
 */
const CHELSEA = { width: 160, height: 106 };

const ANCHORS = 3549;
const VALUES_PER_ANCHOR = 85;
const CLASS_OFFSET = 5;
const CAT = 15;
const CAR = 2;
const STRIDE_8_GRID = 52;

let network: OnnxGraph;
let chelsea: RgbaImage;

/** Reads a binary PPM ("P6") whose header is exactly `P6\n<w> <h>\n255\n` into RGBA. */
function rgbaFromPpm(bytes: Uint8Array, width: number, height: number): RgbaImage {
  const header = new TextEncoder().encode(`P6\n${width} ${height}\n255\n`);
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let pixel = 0; pixel < width * height; pixel++) {
    for (let channel = 0; channel < 3; channel++) {
      data[pixel * 4 + channel] = item(bytes, header.length + pixel * 3 + channel);
    }
  }
  return { width, height, data };
}

function blank(width: number, height: number): RgbaImage {
  return { width, height, data: new Uint8ClampedArray(width * height * 4).fill(128) };
}

/** A network output with one detection per entry, set at a stride-8 grid cell. */
function outputWith(
  detections: readonly {
    cell: number;
    box: [number, number, number, number];
    objectness: number;
    classId: number;
    score: number;
  }[],
): Tensor {
  const data = new Float32Array(ANCHORS * VALUES_PER_ANCHOR);
  for (const { cell, box, objectness, classId, score } of detections) {
    const at = cell * VALUES_PER_ANCHOR;
    data.set([box[0], box[1], Math.log(box[2] / 8), Math.log(box[3] / 8), objectness], at);
    data[at + CLASS_OFFSET + classId] = score;
  }
  return { dims: [1, ANCHORS, VALUES_PER_ANCHOR], data };
}

// Float32 output: whole pixels, the rounding noise dropped.
const sizeOf = (animal: AnimalDetection | undefined): number[] => {
  if (!animal) throw new Error("expected a detection");
  return [animal.centreX, animal.centreY, animal.width, animal.height].map(Math.round);
};

const cellAt = (column: number, row: number): number => row * STRIDE_8_GRID + column;

beforeAll(async () => {
  network = parseOnnx(new Uint8Array(await (await fetch(modelDataUrl)).arrayBuffer()));
  const ppm = new Uint8Array(await (await fetch(chelseaPpmDataUrl)).arrayBuffer());
  chelsea = rgbaFromPpm(ppm, CHELSEA.width, CHELSEA.height);
});

describe("animalFocus", () => {
  it("aims at the cat that fills the picture", () => {
    const focus = animalFocus(chelsea, network);

    if (focus.kind !== "subject") throw new Error("expected the cat to be found");
    const { x, y, width, height } = focus.box;
    expect({ aroundTheMiddle: x < 0.5 && x + width > 0.5 && y < 0.5 && y + height > 0.5 }).toEqual({
      aroundTheMiddle: true,
    });
    expect(width * height).toBeGreaterThan(0.5);
  });

  it("finds nothing to aim at in a blank picture", () => {
    expect(animalFocus(blank(160, 120), network)).toEqual({ kind: "none" });
  });
});

describe("decodeAnimals", () => {
  const WHOLE = { width: 416, height: 416, ratio: 1 };

  it("places a box at its grid cell and size, in picture pixels", () => {
    const output = outputWith([
      { cell: cellAt(10, 20), box: [0.5, 0.5, 64, 32], objectness: 0.9, classId: CAT, score: 0.9 },
    ]);

    const [animal] = decodeAnimals(output, WHOLE);

    expect(sizeOf(animal)).toEqual([84, 164, 64, 32]);
  });

  it("scales the box back by the letterbox ratio", () => {
    const output = outputWith([
      { cell: cellAt(10, 20), box: [0, 0, 64, 32], objectness: 1, classId: CAT, score: 1 },
    ]);

    const [animal] = decodeAnimals(output, { ...WHOLE, ratio: 0.5 });

    expect(sizeOf(animal)).toEqual([160, 320, 128, 64]);
  });

  it("ignores things that are not animals", () => {
    const output = outputWith([
      { cell: cellAt(5, 5), box: [0, 0, 40, 40], objectness: 1, classId: CAR, score: 1 },
      { cell: cellAt(30, 30), box: [0, 0, 40, 40], objectness: 1, classId: CAT, score: 1 },
    ]);

    expect(decodeAnimals(output, WHOLE).map((animal) => animal.centreX)).toEqual([240]);
  });

  it("drops weak detections", () => {
    const output = outputWith([
      { cell: cellAt(5, 5), box: [0, 0, 40, 40], objectness: 0.5, classId: CAT, score: 0.5 },
    ]);

    expect(decodeAnimals(output, WHOLE)).toEqual([]);
  });

  it("keeps only the best of detections on top of each other", () => {
    const output = outputWith([
      { cell: cellAt(10, 10), box: [0, 0, 64, 64], objectness: 0.8, classId: CAT, score: 0.8 },
      { cell: cellAt(11, 10), box: [0, 0, 64, 64], objectness: 0.9, classId: CAT, score: 0.9 },
    ]);

    expect(decodeAnimals(output, WHOLE)).toHaveLength(1);
    expect(decodeAnimals(output, WHOLE)[0]?.score).toBeCloseTo(0.81, 5);
  });
});
