import type { deSharePage } from "./catalogue-de-share-page.ts";
import type { Catalogue } from "./messages.ts";

/** English copy of the page a shared slideshow's link opens; typed to the German keys. */
export const enSharePage: Pick<Catalogue, keyof typeof deSharePage> = {
  "sharePage.eyebrow": "Shared slideshow",
  "sharePage.madeWith": "Shared with Glissando",
  "sharePage.loadingFirst": "Loading the first pictures …",
  "sharePage.loadingLate": "Loading",
  "sharePage.goneTitle": "This link doesn't work any more",
  "sharePage.goneText":
    "Whoever shared the slideshow has turned the link off. Ask them for a new one.",
  "sharePage.unreachableTitle": "Can't reach the slideshow right now",
  "sharePage.unreachableText":
    "The server it lives on isn't answering. It may be restarting; try again in a moment.",
  "sharePage.noscript":
    "This slideshow needs JavaScript. Open the link in a browser such as Safari, Chrome or Firefox.",
};
