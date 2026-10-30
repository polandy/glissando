import type { PictureFocus } from "../library/picture-focus";
import type { StoredPicture } from "../library/stored-slideshow";
import type { KenBurns } from "../player/slideshow";
import { autoKenBurns, KEN_BURNS_EASING } from "./auto-ken-burns";

/**
 * The motion a picture plays at `index`: its own (which stays with it wherever it moves),
 * otherwise the automatic one, which follows the position and aims at the picture's `focus`;
 * `strength` is a mood's Ken Burns strength in place of the default (ADR-0045).
 */
export function pictureKenBurns(
  index: number,
  picture: StoredPicture,
  focus: PictureFocus | undefined,
  strength?: number,
): KenBurns {
  return picture.kenBurns === undefined
    ? autoKenBurns(index, picture, focus, true, strength)
    : { ...picture.kenBurns, easing: KEN_BURNS_EASING };
}

/**
 * The motion each half of a composed portrait pair plays at `index`: automatic, aimed at its own
 * focus, with no horizontal pan so the two halves stay in step (ADR-0028). A paired picture never
 * has an own motion (see `slideUnits`). `strength` is a mood's Ken Burns strength in place of the
 * default (ADR-0045).
 */
export function pairKenBurns(
  index: number,
  first: StoredPicture,
  firstFocus: PictureFocus | undefined,
  second: StoredPicture,
  secondFocus: PictureFocus | undefined,
  strength?: number,
): { readonly first: KenBurns; readonly second: KenBurns } {
  return {
    first: autoKenBurns(index, first, firstFocus, false, strength),
    second: autoKenBurns(index, second, secondFocus, false, strength),
  };
}
