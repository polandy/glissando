import type { Catalogue } from "./messages";
import type { deCulling } from "./catalogue-de-culling";

/** English copy of culling; typed to the German keys. */
export const enCulling: Pick<Catalogue, keyof typeof deCulling> = {
  "cull.checkingLabel": "checked for bursts and blur …",
  "cull.setAside": "Set aside · {count}",
  "cull.takeAllIn": "Take all in",
  "cull.why": "These are not in the slideshow. Take one in with +.",
  "cull.burst": "Burst",
  "cull.sharpestKept": "· the sharpest is kept",
  "cull.blurry": "Blurry",
  "cull.kept": "Kept",
  "cull.similar": "Similar",
  "cull.takeIn": "Take in picture from {date} at {time}",
};
