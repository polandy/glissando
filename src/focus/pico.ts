/*
 * The face detector of pico.js, ported to TypeScript with the same arithmetic: `unpack_cascade`,
 * `run_cascade` and `cluster_detections` of
 * https://github.com/nenadmarkus/picojs/blob/afffa50ec4134a47005f2cbf8112eaa69f65f37e/pico.js
 * (sha256 785b981cc79e5fa3f7557dc3fa7773629d7529994d7627de41b77d8687649309).
 *
 * The MIT License
 *
 * Copyright (c) 2013 Nenad Markus
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software
 * and associated documentation files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
 * BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import type { GreyImage } from "./grey-image";

/** Scores a square region centred on (row, column): above 0 is a face, -1 is rejected early. */
export type Cascade = (row: number, column: number, size: number, image: GreyImage) => number;

/** A square candidate region, centred on (row, column), in pixels. */
export interface Detection {
  readonly row: number;
  readonly column: number;
  readonly size: number;
  readonly score: number;
}

/** How densely the picture is scanned, at which square sizes. */
export interface ScanParameters {
  /** Step between neighbouring regions, as a fraction of their size. */
  readonly shiftFactor: number;
  readonly minSize: number;
  readonly maxSize: number;
  /** Growth from one region size to the next. */
  readonly scaleFactor: number;
}

// The cascade file starts with a version number and training data the detector does not use.
const CASCADE_HEADER_BYTES = 8;
const INT32_BYTES = 4;
const FLOAT32_BYTES = 4;
// Every internal tree node holds one binary test: two pixel offsets of (row, column) each.
const BYTES_PER_TEST = 4;
// Pixel offsets are fixed point with 8 fractional bits.
const FIXED_POINT_SHIFT = 8;
const FIXED_POINT_ONE = 1 << FIXED_POINT_SHIFT;
const REJECTED = -1;

/** Builds the classifier from a pico cascade file (such as `facefinder`). */
export function unpackCascade(bytes: Int8Array): Cascade {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = CASCADE_HEADER_BYTES;
  const treeDepth = view.getInt32(offset, true);
  offset += INT32_BYTES;
  const treeCount = view.getInt32(offset, true);
  offset += INT32_BYTES;

  const leavesPerTree = 2 ** treeDepth;
  const testBytesPerTree = BYTES_PER_TEST * leavesPerTree;
  // Each tree's tests start with one unused node, so node index 1 is its root.
  const tests = new Int8Array(treeCount * testBytesPerTree);
  const predictions = new Float32Array(treeCount * leavesPerTree);
  const thresholds = new Float32Array(treeCount);
  for (let tree = 0; tree < treeCount; tree++) {
    const storedTestBytes = testBytesPerTree - BYTES_PER_TEST;
    tests.set(
      bytes.subarray(offset, offset + storedTestBytes),
      tree * testBytesPerTree + BYTES_PER_TEST,
    );
    offset += storedTestBytes;
    for (let leaf = 0; leaf < leavesPerTree; leaf++) {
      predictions[tree * leavesPerTree + leaf] = view.getFloat32(offset, true);
      offset += FLOAT32_BYTES;
    }
    thresholds[tree] = view.getFloat32(offset, true);
    offset += FLOAT32_BYTES;
  }
  const finalThreshold = thresholds[treeCount - 1] ?? 0;

  return (row, column, size, image) => {
    const { pixels, width } = image;
    const fixedRow = FIXED_POINT_ONE * row;
    const fixedColumn = FIXED_POINT_ONE * column;
    const pixelAt = (test: number, first: number): number =>
      pixels[
        ((fixedRow + (tests[test + first] ?? 0) * size) >> FIXED_POINT_SHIFT) * width +
          ((fixedColumn + (tests[test + first + 1] ?? 0) * size) >> FIXED_POINT_SHIFT)
      ] ?? 0;

    let root = 0;
    let output = 0;
    for (let tree = 0; tree < treeCount; tree++) {
      let node = 1;
      for (let level = 0; level < treeDepth; level++) {
        const test = root + BYTES_PER_TEST * node;
        node = 2 * node + (pixelAt(test, 0) <= pixelAt(test, 2) ? 1 : 0);
      }
      output += predictions[leavesPerTree * tree + node - leavesPerTree] ?? 0;
      if (output <= (thresholds[tree] ?? 0)) return REJECTED;
      root += testBytesPerTree;
    }
    return output - finalThreshold;
  };
}

/** Every region, at every scanned size, the cascade scores as a face. */
export function runCascade(
  image: GreyImage,
  cascade: Cascade,
  parameters: ScanParameters,
): Detection[] {
  const detections: Detection[] = [];
  for (let size = parameters.minSize; size <= parameters.maxSize; size *= parameters.scaleFactor) {
    const step = Math.max(parameters.shiftFactor * size, 1) >> 0;
    // Keeps every region, and every pixel the cascade samples in it, inside the picture.
    const margin = (size / 2 + 1) >> 0;
    for (let row = margin; row <= image.height - margin; row += step) {
      for (let column = margin; column <= image.width - margin; column += step) {
        const score = cascade(row, column, size, image);
        if (score > 0) detections.push({ row, column, size, score });
      }
    }
  }
  return detections;
}

/**
 * Merges overlapping detections (non-maximum suppression): each cluster is the mean region of
 * its members, scored by their summed score, so a face found many times outweighs a stray hit.
 */
export function clusterDetections(
  detections: readonly Detection[],
  overlapThreshold: number,
): Detection[] {
  const byScore = [...detections].sort((a, b) => b.score - a.score);
  const assigned = new Array<boolean>(byScore.length).fill(false);
  const clusters: Detection[] = [];
  byScore.forEach((seed, i) => {
    if (assigned[i]) return;
    let row = 0;
    let column = 0;
    let size = 0;
    let score = 0;
    let members = 0;
    for (let j = i; j < byScore.length; j++) {
      const other = byScore[j];
      if (other === undefined || overlap(seed, other) <= overlapThreshold) continue;
      assigned[j] = true;
      row += other.row;
      column += other.column;
      size += other.size;
      score += other.score;
      members += 1;
    }
    clusters.push({ row: row / members, column: column / members, size: size / members, score });
  });
  return clusters;
}

/** Intersection over union of two square regions. */
function overlap(a: Detection, b: Detection): number {
  const rows = Math.max(
    0,
    Math.min(a.row + a.size / 2, b.row + b.size / 2) -
      Math.max(a.row - a.size / 2, b.row - b.size / 2),
  );
  const columns = Math.max(
    0,
    Math.min(a.column + a.size / 2, b.column + b.size / 2) -
      Math.max(a.column - a.size / 2, b.column - b.size / 2),
  );
  return (rows * columns) / (a.size * a.size + b.size * b.size - rows * columns);
}
