import type { FocusBox, PictureFocus } from "../library/picture-focus";
import type { GreyImage } from "./grey-image";
import {
  clusterDetections,
  runCascade,
  type Cascade,
  type Detection,
  type ScanParameters,
} from "./pico";

// The scan and clustering of picojs's examples/image.html, as measured in ADR-0012.
const SCAN: ScanParameters = { shiftFactor: 0.1, minSize: 20, maxSize: 1000, scaleFactor: 1.1 };
const CLUSTER_OVERLAP = 0.2;
// Clusters scoring at most this are mostly not faces (ADR-0012).
const MIN_FACE_SCORE = 5;

/**
 * Where to aim in a picture: the face with the largest score-weighted area, as a box in picture
 * coordinates; nothing when no face scores high enough (ADR-0012).
 */
export function findFocus(image: GreyImage, cascade: Cascade): PictureFocus {
  const faces = clusterDetections(runCascade(image, cascade, SCAN), CLUSTER_OVERLAP).filter(
    (face) => face.score > MIN_FACE_SCORE,
  );
  const strongest = faces.reduce<Detection | undefined>(
    (best, face) => (best === undefined || weight(face) > weight(best) ? face : best),
    undefined,
  );
  return strongest === undefined
    ? { kind: "none" }
    : { kind: "subject", box: boxOf(strongest, image) };
}

function weight(face: Detection): number {
  return face.size * face.size * face.score;
}

// Inside the picture already: the scan only places regions that fit in it.
function boxOf(face: Detection, image: GreyImage): FocusBox {
  return {
    x: (face.column - face.size / 2) / image.width,
    y: (face.row - face.size / 2) / image.height,
    width: face.size / image.width,
    height: face.size / image.height,
  };
}
