import type { Catalogue } from "./messages.ts";
import type { deLook } from "./catalogue-de-look.ts";

/** English copy of the slideshow's colour grade; typed to the German keys. */
export const enLook: Pick<Catalogue, keyof typeof deLook> = {
  "look.title": "Look",
  "look.none": "None",
  "look.warm": "Warm",
  "look.cool": "Cool",
  "look.vivid": "Vivid",
  "look.film": "Film",
  "look.black-and-white": "Black & white",
  "look.faded": "Faded",
  "look.defaultTag": "Default",
  "look.hint":
    "Applies to every picture and video in this slideshow, also in the exported video and web page. Title and closing slides and captions stay as they are.",
  "look.reset": "Back to None",
  "look.alreadyNone": "The slideshow has no look",
  "look.holdToCompare": "Hold to compare",
  "look.original": "Original",
  "look.resetDone": "Look back to None",
};
