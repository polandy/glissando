import type { deRemotePage } from "./catalogue-de-remote-page.ts";
import type { Catalogue } from "./messages.ts";

/** English copy of the phone's remote for a slideshow on the TV; typed to the German keys. */
export const enRemotePage: Pick<Catalogue, keyof typeof deRemotePage> = {
  "remotePage.showing": "Showing on TV",
  "remotePage.connecting": "Connecting …",
  "remotePage.reconnecting": "Reconnecting …",
  "remotePage.tvAway": "The TV is not there",
  "remotePage.tvAwayNote": "The TV closed its page. Open it on the TV again to carry on.",
  "remotePage.needsTvOkNote": "Press OK on the TV once to allow sound.",
  "remotePage.waiting": "Waiting for the TV to show a slideshow …",
  "remotePage.pictureOf": "Picture {number} of {count}",
  "remotePage.playing": "Playing",
  "remotePage.paused": "Paused",
  "remotePage.finished": "Finished",
  "remotePage.previous": "Previous picture",
  "remotePage.next": "Next picture",
  "remotePage.position": "Position in the slideshow",
  "remotePage.volume": "Music volume",
  "remotePage.startOver": "Start over",
  "remotePage.disconnect": "Disconnect",
  "remotePage.commandFailed": "That didn't reach the TV.",
  "remotePage.endedTitle": "This remote has ended",
  "remotePage.endedText":
    "The TV was disconnected or closed its page. To show a slideshow again, start on the TV.",
  "remotePage.noscript":
    "This remote needs JavaScript. Open it in a browser such as Safari, Chrome or Firefox.",
};
