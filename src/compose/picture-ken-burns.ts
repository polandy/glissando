import type { StoredPicture } from "../library/stored-slideshow";
import type { KenBurns } from "../player/slideshow";
import { autoKenBurns, KEN_BURNS_EASING } from "./auto-ken-burns";

/**
 * The motion a picture plays at `index`: its own (which stays with it wherever it moves),
 * otherwise the automatic one, which follows the position.
 */
export function pictureKenBurns(index: number, picture: StoredPicture): KenBurns {
  return picture.kenBurns === undefined
    ? autoKenBurns(index, picture)
    : { ...picture.kenBurns, easing: KEN_BURNS_EASING };
}
