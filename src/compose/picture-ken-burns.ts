import type { PictureFocus } from "../library/picture-focus";
import type { StoredPicture } from "../library/stored-slideshow";
import type { KenBurns } from "../player/slideshow";
import { autoKenBurns, KEN_BURNS_EASING } from "./auto-ken-burns";

/**
 * The motion a picture plays at `index`: its own (which stays with it wherever it moves),
 * otherwise the automatic one, which follows the position and aims at the picture's `focus`.
 */
export function pictureKenBurns(
  index: number,
  picture: StoredPicture,
  focus: PictureFocus | undefined,
): KenBurns {
  return picture.kenBurns === undefined
    ? autoKenBurns(index, picture, focus)
    : { ...picture.kenBurns, easing: KEN_BURNS_EASING };
}
