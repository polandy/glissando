import type { GreyImage } from "../focus/grey-image";
import { differenceHash } from "./difference-hash";
import type { PictureMeasure } from "./picture-checker";
import { sharpness } from "./sharpness";

/** Everything the cull needs of one grey thumbnail. */
export function measurePicture(grey: GreyImage): PictureMeasure {
  return { sharpness: sharpness(grey), hash: differenceHash(grey) };
}
