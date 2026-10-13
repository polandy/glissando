import type { deTvSheet } from "./catalogue-de-tv-sheet.ts";
import type { Catalogue } from "./messages.ts";

/** English copy of "Show on TV" in the app; typed to the German keys. */
export const enTvSheet: Pick<Catalogue, keyof typeof deTvSheet> = {
  "tvSheet.rowTitle": "Show on TV",
  "tvSheet.rowText": "Play it on a TV and use your phone as the remote",
  "tvSheet.title": "Show on TV",
  "tvSheet.codeBefore": "Open ",
  "tvSheet.codeAfter":
    " in the TV's browser, then scan the code on the screen with your camera or type it here.",
  "tvSheet.codeLabel": "Code from the TV",
  "tvSheet.letter": "Letter {number} of {count}",
  "tvSheet.lettersTyped": "{typed} of {count} letters",
  "tvSheet.connect": "Connect",
  "tvSheet.connecting": "Connecting …",
  "tvSheet.connected": "Connected to TV {code}",
  "tvSheet.which": "Which slideshow should the TV show?",
  "tvSheet.loadingSlideshows": "Reading your slideshows …",
  "tvSheet.noSlideshows": "There is no slideshow on your Glissando server yet.",
  "tvSheet.cardFacts": "{pictures} · {duration}",
  "tvSheet.show": "Show on TV",
  "tvSheet.disconnect": "Disconnect",
  "tvSheet.noMatchStrong": "That code doesn't match a TV",
  "tvSheet.noMatchText":
    "Check the letters on the TV screen. A code stops working after the TV is closed or has waited 15 minutes; reload the TV's page for a new one.",
  "tvSheet.typeAgain": "Type it again",
  "tvSheet.tvClosed": "The TV was closed. Open {address} on it again and type its new code.",
  "tvSheet.claimFailed": "Couldn't connect to the TV. Your Glissando server isn't answering.",
  "tvSheet.listFailed": "Couldn't read your slideshows. Your Glissando server isn't answering.",
  "tvSheet.showFailed":
    "Couldn't send the slideshow to the TV. Your Glissando server isn't answering.",
};
