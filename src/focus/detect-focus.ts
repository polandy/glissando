import type { PictureFocus } from "../library/picture-focus";
import { findFocus } from "./find-focus";
import { greyFromRgba } from "./grey-image";
import { objectFocus, type RgbaImage } from "./object-focus";
import type { OnnxGraph } from "./onnx/onnx-model";
import type { Cascade } from "./pico";

/** What the detectors need loaded: the face cascade (ADR-0012) and the object network (ADR-0036). */
export interface FocusModels {
  readonly cascade: Cascade;
  readonly objects: OnnxGraph;
}

/**
 * Where to aim in a picture: at its people when there is a face, else at its main object
 * (an animal, a vehicle, a thing), else nothing. The object network is the costlier of the two,
 * so it only looks at pictures without a face.
 */
export function detectFocus(image: RgbaImage, { cascade, objects }: FocusModels): PictureFocus {
  const faces = findFocus(greyFromRgba(image.data, image.width, image.height), cascade);
  return faces.kind === "subject" ? faces : objectFocus(image, objects);
}
