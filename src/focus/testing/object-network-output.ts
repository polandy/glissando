import type { Tensor } from "../onnx/tensor-ops";

// YOLOX-nano's output for a 416 px input: 52² + 26² + 13² grid cells, each box, objectness, 80 classes.
const ANCHORS = 3549;
const VALUES_PER_ANCHOR = 85;
const CLASS_OFFSET = 5;
const STRIDE_8_GRID = 52;
const STRIDE_8 = 8;

export const CAT = 15;

export interface FakeDetection {
  readonly cell: number;
  readonly box: readonly [number, number, number, number];
  readonly objectness: number;
  readonly classId: number;
  readonly score: number;
}

/** The stride-8 grid cell at a column and row. */
export const cellAt = (column: number, row: number): number => row * STRIDE_8_GRID + column;

/** A network output with one detection per entry, set at a stride-8 grid cell. */
export function networkOutput(detections: readonly FakeDetection[]): Tensor {
  const data = new Float32Array(ANCHORS * VALUES_PER_ANCHOR);
  for (const { cell, box, objectness, classId, score } of detections) {
    const at = cell * VALUES_PER_ANCHOR;
    const [offsetX, offsetY, width, height] = box;
    data.set(
      [offsetX, offsetY, Math.log(width / STRIDE_8), Math.log(height / STRIDE_8), objectness],
      at,
    );
    data[at + CLASS_OFFSET + classId] = score;
  }
  return { dims: [1, ANCHORS, VALUES_PER_ANCHOR], data };
}
