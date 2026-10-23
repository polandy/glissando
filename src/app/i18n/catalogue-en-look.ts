import type { Catalogue } from "./messages.ts";
import type { deLook } from "./catalogue-de-look.ts";

/** English copy of the slideshow's colour grade; typed to the German keys. */
export const enLook: Pick<Catalogue, keyof typeof deLook> = {
  "look.resetDone": "Look back to None",
};
