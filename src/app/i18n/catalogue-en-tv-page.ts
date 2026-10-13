import type { deTvPage } from "./catalogue-de-tv-page.ts";
import type { Catalogue } from "./messages.ts";

/** English copy of the share page as the TV page; typed to the German keys. */
export const enTvPage: Pick<Catalogue, keyof typeof deTvPage> = {
  "tvPage.pairTitle": "Show a slideshow here",
  "tvPage.pairText":
    "On your phone, open a slideshow and tap “Show on TV”. Scan the code, or type it.",
  "tvPage.allowSound": "Allow sound",
  "tvPage.soundAllowed": "Sound is allowed",
  "tvPage.connectedTitle": "Phone connected",
  "tvPage.connectedText": "Choose a slideshow on your phone.",
  "tvPage.endedTitle": "That was “{title}”",
  "tvPage.endedText": "Press “Play again” on your phone, or pick another slideshow.",
  "tvPage.unreachableTitle": "Can't reach the server",
  "tvPage.unreachableText": "It may be restarting. This page tries again by itself.",
  "tvPage.controlWithPhone": "Control with your phone",
  "tvPage.scanToControl": "Scan the code with your phone to control the slideshow.",
  "tvPage.qrCode": "QR code for your phone",
  "tvPage.notePlaying": "Playing",
  "tvPage.notePaused": "Paused",
  "tvPage.noteNext": "Next",
  "tvPage.notePrevious": "Previous",
  "tvPage.noteVolume": "Volume {percent}%",
};
