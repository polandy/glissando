import type { PictureFocus } from "../library/picture-focus";
import { animalFocus, type RgbaImage } from "./animal-focus";
import { findFocus } from "./find-focus";
import { greyFromRgba } from "./grey-image";
import type { OnnxGraph } from "./onnx/onnx-model";
import type { Cascade } from "./pico";

/** What the detectors need loaded: the face cascade (ADR-0012) and the animal network (ADR-0036). */
export interface FocusModels {
  readonly cascade: Cascade;
  readonly animals: OnnxGraph;
}

/**
 * Where to aim in a picture: at its people when there is a face, else at its animals, else
 * nothing. The animal network is the costlier of the two, so it only looks at pictures without
 * a face.
 */
export function detectFocus(image: RgbaImage, { cascade, animals }: FocusModels): PictureFocus {
  const faces = findFocus(greyFromRgba(image.data, image.width, image.height), cascade);
  return faces.kind === "subject" ? faces : animalFocus(image, animals);
}
