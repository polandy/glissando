import { groupFocusBox } from "../library/group-focus-box";
import type { FocusBox, PictureFocus } from "../library/picture-focus";
import { item } from "./onnx/item";
import type { OnnxGraph } from "./onnx/onnx-model";
import { runOnnx } from "./onnx/run-onnx";
import type { Tensor } from "./onnx/tensor-ops";

/** A picture as the canvas hands it over: RGBA, row by row from the top left. */
export interface RgbaImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

/** An object (a person, an animal, a thing) in picture pixels. */
export interface ObjectDetection {
  readonly centreX: number;
  readonly centreY: number;
  readonly width: number;
  readonly height: number;
  readonly score: number;
}

/** How a picture sits in the network's square input: scaled by `ratio`, the rest padded. */
export interface Letterbox {
  readonly ratio: number;
}

// YOLOX-nano as exported upstream (ADR-0036): a 416 px square, BGR, 0..255, padded with grey 114.
const INPUT_SIZE = 416;
const PAD_VALUE = 114;
const STRIDES = [8, 16, 32];
const VALUES_PER_ANCHOR = 85;
const OBJECTNESS_OFFSET = 4;
const CLASS_OFFSET = 5;
// The 80 COCO classes, person to toothbrush: anything the network names can be the subject.
const CLASS_COUNT = 80;
// Objectness times class score; below it the detections are mostly clutter (ADR-0036).
const MIN_OBJECT_SCORE = 0.35;
const NMS_OVERLAP = 0.45;

/**
 * Where to aim in a picture of objects: the one with the largest score-weighted area together
 * with every one not much smaller than it, as one box in picture coordinates; nothing when no
 * object scores high enough (ADR-0036, ADR-0029).
 */
export function objectFocus(image: RgbaImage, network: OnnxGraph): PictureFocus {
  const { input, letterbox } = letterboxed(image);
  const objects = decodeObjects(runOnnx(network, input), letterbox);
  const strongest = objects.reduce<ObjectDetection | undefined>(
    (best, object) => (best === undefined || weight(object) > weight(best) ? object : best),
    undefined,
  );
  if (strongest === undefined) return { kind: "none" };
  const others = objects.filter((object) => object !== strongest).map((o) => boxOf(o, image));
  return {
    kind: "subject",
    box: groupFocusBox(boxOf(strongest, image), others),
    foundBy: "object",
  };
}

/**
 * The objects the network found, best first, each place found once. `output` is the raw
 * network output: per grid cell the box offset and size (log scale), objectness and class scores.
 */
export function decodeObjects(output: Tensor, { ratio }: Letterbox): ObjectDetection[] {
  const found: ObjectDetection[] = [];
  let anchor = 0;
  for (const stride of STRIDES) {
    const cells = INPUT_SIZE / stride;
    for (let row = 0; row < cells; row++) {
      for (let column = 0; column < cells; column++, anchor++) {
        const at = anchor * VALUES_PER_ANCHOR;
        const score = objectScore(output.data, at);
        if (score < MIN_OBJECT_SCORE) continue;
        found.push({
          centreX: ((item(output.data, at) + column) * stride) / ratio,
          centreY: ((item(output.data, at + 1) + row) * stride) / ratio,
          width: (Math.exp(item(output.data, at + 2)) * stride) / ratio,
          height: (Math.exp(item(output.data, at + 3)) * stride) / ratio,
          score,
        });
      }
    }
  }
  return withoutOverlaps(found.sort((a, b) => b.score - a.score));
}

function objectScore(data: Float32Array, at: number): number {
  let best = 0;
  for (let id = 0; id < CLASS_COUNT; id++) {
    best = Math.max(best, item(data, at + CLASS_OFFSET + id));
  }
  return item(data, at + OBJECTNESS_OFFSET) * best;
}

// Greedy non-maximum suppression over detections sorted best first.
function withoutOverlaps(sorted: readonly ObjectDetection[]): ObjectDetection[] {
  const kept: ObjectDetection[] = [];
  for (const candidate of sorted) {
    if (kept.every((other) => overlap(candidate, other) <= NMS_OVERLAP)) kept.push(candidate);
  }
  return kept;
}

function overlap(a: ObjectDetection, b: ObjectDetection): number {
  const across =
    Math.min(a.centreX + a.width / 2, b.centreX + b.width / 2) -
    Math.max(a.centreX - a.width / 2, b.centreX - b.width / 2);
  const down =
    Math.min(a.centreY + a.height / 2, b.centreY + b.height / 2) -
    Math.max(a.centreY - a.height / 2, b.centreY - b.height / 2);
  if (across <= 0 || down <= 0) return 0;
  const shared = across * down;
  return shared / (a.width * a.height + b.width * b.height - shared);
}

const weight = (object: ObjectDetection): number => object.width * object.height * object.score;

// Clamped into the picture: the network's boxes may reach past its edge.
function boxOf(object: ObjectDetection, image: RgbaImage): FocusBox {
  const left = Math.max(0, (object.centreX - object.width / 2) / image.width);
  const top = Math.max(0, (object.centreY - object.height / 2) / image.height);
  const right = Math.min(1, (object.centreX + object.width / 2) / image.width);
  const bottom = Math.min(1, (object.centreY + object.height / 2) / image.height);
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function letterboxed(image: RgbaImage): { input: Tensor; letterbox: Letterbox } {
  const ratio = Math.min(INPUT_SIZE / image.width, INPUT_SIZE / image.height);
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));
  const plane = INPUT_SIZE * INPUT_SIZE;
  const data = new Float32Array(3 * plane).fill(PAD_VALUE);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let channel = 0; channel < 3; channel++) {
        // The network wants blue first.
        data[(2 - channel) * plane + y * INPUT_SIZE + x] = sample(
          image,
          (x + 0.5) / ratio,
          (y + 0.5) / ratio,
          channel,
        );
      }
    }
  }
  return {
    input: { dims: [1, 3, INPUT_SIZE, INPUT_SIZE], data },
    letterbox: { ratio },
  };
}

// Bilinear sample at a position in picture pixels (pixel centres at +0.5).
function sample(image: RgbaImage, x: number, y: number, channel: number): number {
  const left = Math.min(Math.max(Math.floor(x - 0.5), 0), image.width - 1);
  const top = Math.min(Math.max(Math.floor(y - 0.5), 0), image.height - 1);
  const right = Math.min(left + 1, image.width - 1);
  const bottom = Math.min(top + 1, image.height - 1);
  const fx = Math.min(Math.max(x - 0.5 - left, 0), 1);
  const fy = Math.min(Math.max(y - 0.5 - top, 0), 1);
  const at = (column: number, row: number) =>
    item(image.data, (row * image.width + column) * 4 + channel);
  const upper = at(left, top) * (1 - fx) + at(right, top) * fx;
  const lower = at(left, bottom) * (1 - fx) + at(right, bottom) * fx;
  return upper * (1 - fy) + lower * fy;
}
