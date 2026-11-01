import type { Catalogue } from "./messages.ts";
import type { deSelection } from "./catalogue-de-selection.ts";

/** English copy of the selection bar and Move to…; typed to the German keys. */
export const enSelection: Pick<Catalogue, keyof typeof deSelection> = {
  "slideshow.edit": "Edit",
  "slideshow.moveTo": "Move to\u00a0…",
  "slideshow.moveToShort": "Move",
  "slideshow.moveStart": "Start",
  "slideshow.moveEnd": "End",
  "slideshow.moveBefore": "Before picture\u00a0…",
  "slideshow.moveConfirm": "Move",
  "slideshow.moveNumberLower": "Lower picture number",
  "slideshow.moveNumberHigher": "Higher picture number",
};
