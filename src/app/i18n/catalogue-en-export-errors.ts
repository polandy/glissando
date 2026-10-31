import type { deExportErrors } from "./catalogue-de-export-errors.ts";
import type { Catalogue } from "./messages.ts";

/** English sentences for a video or web page that could not be created, with a way out. */
export const enExportErrors: Pick<Catalogue, keyof typeof deExportErrors> = {
  "exportErrors.storageFullTitle": "Not enough space on this device.",
  "exportErrors.storageFullText": "Choose Small, or free up space and try again.",
  "exportErrors.clipVideoTitle": "Clip {clip} can’t be made into a video here.",
  "exportErrors.clipVideoText":
    "It still plays in the slideshow. Remove the clip, or create the video in another browser.",
  "exportErrors.clipPageTitle": "Clip {clip} can’t be made into a web page here.",
  "exportErrors.clipPageText":
    "It still plays in the slideshow. Remove the clip, or create the web page in another browser.",
  "exportErrors.unsupportedVideoTitle": "This browser can’t create videos.",
  "exportErrors.unsupportedPageTitle": "This browser can’t create web pages.",
  "exportErrors.unsupportedText":
    "Current Chrome, Edge, Firefox and Safari can. Open Glissando there and try again.",
  "exportErrors.cancelledTitle": "Stopped.",
  "exportErrors.cancelledText": "Nothing was saved.",
  "exportErrors.unknownVideoTitle": "Video not created.",
  "exportErrors.unknownPageTitle": "Web page not created.",
  "exportErrors.unknownText": "Something went wrong. Nothing was saved.",
  "exportErrors.tryAgain": "Try again",
  "exportErrors.smallerSize": "Choose another size",
  "exportErrors.showDetails": "Show details",
  "exportErrors.hideDetails": "Hide details",
};
