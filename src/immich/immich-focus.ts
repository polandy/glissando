import { groupFocusBox } from "../library/group-focus-box";
import type { FocusBox, PictureFocus } from "../library/picture-focus";
import type { ImmichFace } from "./immich-client";

const area = (face: ImmichFace): number => (face.x2 - face.x1) * (face.y2 - face.y1);

const clampToPicture = (value: number): number => Math.min(1, Math.max(0, value));

function normalisedBox(face: ImmichFace): FocusBox {
  const left = clampToPicture(face.x1 / face.imageWidth);
  const top = clampToPicture(face.y1 / face.imageHeight);
  const right = clampToPicture(face.x2 / face.imageWidth);
  const bottom = clampToPicture(face.y2 / face.imageHeight);
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/**
 * The focus Immich's faces give a picture: its largest face box by area, as Immich gives no
 * score, together with every face not much smaller than it (ADR-0029). Null for no faces, which may mean "not scanned yet", so the on-device pass still looks
 * (ADR-0013).
 */
export function focusFromFaces(faces: readonly ImmichFace[]): PictureFocus | null {
  let largest: ImmichFace | null = null;
  for (const face of faces) {
    if (largest === null || area(face) > area(largest)) {
      largest = face;
    }
  }
  if (largest === null) return null;
  const others = faces.filter((face) => face !== largest).map(normalisedBox);
  return {
    kind: "subject",
    box: groupFocusBox(normalisedBox(largest), others),
    foundBy: "immich-faces",
  };
}
