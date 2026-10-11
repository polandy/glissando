import type { Catalogue } from "./messages";
import type { deCulling } from "./catalogue-de-culling";

/** English copy of culling; typed to the German keys. */
export const enCulling: Pick<Catalogue, keyof typeof deCulling> = {
  "cull.checkingLabel": "checked for similar shots and blur …",
  "cull.setAside": "Set aside · {count}",
  "cull.takeAllIn": "Take all in",
  "cull.why": "These are not in the slideshow. Take one in with +.",
  "cull.similarGroup": "Similar ·",
  "cull.sharpestKept": "· the sharpest is kept",
  "cull.blurry": "Blurry",
  "cull.kept": "Kept",
  "cull.similar": "Similar",
  "cull.takeIn": "Take in picture from {date} at {time}",
};
