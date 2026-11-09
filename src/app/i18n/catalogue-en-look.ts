import type { Catalogue } from "./messages.ts";
import type { deLook } from "./catalogue-de-look.ts";

/** English copy of the slideshow's colour grade; typed to the German keys. */
export const enLook: Pick<Catalogue, keyof typeof deLook> = {
  "slideshow.lookDefault": "automatic",
  "look.title": "Look",
  "look.none": "None",
  "look.warm": "Warm",
  "look.cool": "Cool",
  "look.vivid": "Vivid",
  "look.film": "Film",
  "look.black-and-white": "Black & white",
  "look.faded": "Faded",
  "look.defaultTag": "Automatic",
  "look.hint":
    "Applies to every picture and video in this slideshow, also in the video and web page you share. Title and closing slides and captions stay as they are.",
  "look.reset": "Back to None",
  "look.alreadyNone": "The slideshow has no look",
  "look.holdToCompare": "Hold to compare",
  "look.original": "Original",
  "look.resetDone": "Look back to None",
};
