import type { SharePageLanguages, SharePageWords } from "../../share-page/share-page-words";
import { de } from "../i18n/catalogue-de";
import { en } from "../i18n/catalogue-en";
import type { Catalogue } from "../i18n/messages";

/**
 * The share page's words in both languages, from the catalogue; the build writes them into the
 * page (build/share-page-plugin.ts), which fills in the slideshow's own numbers.
 */
export function sharePageLanguages(): SharePageLanguages {
  return { de: sharePageWords(de), en: sharePageWords(en) };
}

function sharePageWords(catalogue: Catalogue): SharePageWords {
  return {
    eyebrow: catalogue["sharePage.eyebrow"],
    summary: catalogue["htmlPage.summary"],
    pictures: catalogue["units.pictures"],
    withMusic: catalogue["htmlExport.withMusic"],
    withoutMusic: catalogue["htmlExport.withoutMusic"],
    madeWith: catalogue["sharePage.madeWith"],
    play: catalogue["htmlPage.play"],
    pause: catalogue["htmlPage.pause"],
    mute: catalogue["htmlPage.mute"],
    unmute: catalogue["htmlPage.unmute"],
    fullScreen: catalogue["htmlPage.fullScreen"],
    timeline: catalogue["htmlPage.timeline"],
    playAgain: catalogue["htmlPage.playAgain"],
    cannotPlay: catalogue["htmlPage.cannotPlay"],
    loadingFirst: catalogue["sharePage.loadingFirst"],
    loadingLate: catalogue["sharePage.loadingLate"],
    goneTitle: catalogue["sharePage.goneTitle"],
    goneText: catalogue["sharePage.goneText"],
    unreachableTitle: catalogue["sharePage.unreachableTitle"],
    unreachableText: catalogue["sharePage.unreachableText"],
    tryAgain: catalogue["server.tryAgain"],
    noscript: catalogue["sharePage.noscript"],
  };
}
