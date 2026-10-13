import type { RemotePageLanguages, RemotePageWords } from "../../remote-page/remote-page-words.ts";
import { de } from "../i18n/catalogue-de.ts";
import { en } from "../i18n/catalogue-en.ts";
import type { Catalogue } from "../i18n/messages.ts";

/**
 * The remote page's words in both languages, from the catalogue; the build writes them into the
 * page (build/remote-page-plugin.ts).
 */
export function remotePageLanguages(): RemotePageLanguages {
  return { de: remotePageWords(de), en: remotePageWords(en) };
}

function remotePageWords(catalogue: Catalogue): RemotePageWords {
  return {
    showing: catalogue["remotePage.showing"],
    connecting: catalogue["remotePage.connecting"],
    reconnecting: catalogue["remotePage.reconnecting"],
    tvAway: catalogue["remotePage.tvAway"],
    tvAwayNote: catalogue["remotePage.tvAwayNote"],
    needsTvOkNote: catalogue["remotePage.needsTvOkNote"],
    waiting: catalogue["remotePage.waiting"],
    pictureOf: catalogue["remotePage.pictureOf"],
    playing: catalogue["remotePage.playing"],
    paused: catalogue["remotePage.paused"],
    finished: catalogue["remotePage.finished"],
    play: catalogue["htmlPage.play"],
    pause: catalogue["htmlPage.pause"],
    playAgain: catalogue["htmlPage.playAgain"],
    previous: catalogue["remotePage.previous"],
    next: catalogue["remotePage.next"],
    position: catalogue["remotePage.position"],
    volume: catalogue["remotePage.volume"],
    startOver: catalogue["remotePage.startOver"],
    disconnect: catalogue["remotePage.disconnect"],
    commandFailed: catalogue["remotePage.commandFailed"],
    tryAgain: catalogue["server.tryAgain"],
    endedTitle: catalogue["remotePage.endedTitle"],
    endedText: catalogue["remotePage.endedText"],
    noscript: catalogue["remotePage.noscript"],
  };
}
