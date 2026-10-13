import type { SharePageLanguages, SharePageWords } from "../../share-page/share-page-words.ts";
import { de } from "../i18n/catalogue-de.ts";
import { en } from "../i18n/catalogue-en.ts";
import type { Catalogue } from "../i18n/messages.ts";

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
    appName: catalogue["app.name"],
    tvPairTitle: catalogue["tvPage.pairTitle"],
    tvPairText: catalogue["tvPage.pairText"],
    tvAllowSound: catalogue["tvPage.allowSound"],
    tvSoundAllowed: catalogue["tvPage.soundAllowed"],
    tvConnectedTitle: catalogue["tvPage.connectedTitle"],
    tvConnectedText: catalogue["tvPage.connectedText"],
    tvEndedTitle: catalogue["tvPage.endedTitle"],
    tvEndedText: catalogue["tvPage.endedText"],
    tvUnreachableTitle: catalogue["tvPage.unreachableTitle"],
    tvUnreachableText: catalogue["tvPage.unreachableText"],
    tvControlWithPhone: catalogue["tvPage.controlWithPhone"],
    tvScanToControl: catalogue["tvPage.scanToControl"],
    tvQrCode: catalogue["tvPage.qrCode"],
    tvNotePlaying: catalogue["tvPage.notePlaying"],
    tvNotePaused: catalogue["tvPage.notePaused"],
    tvNoteNext: catalogue["tvPage.noteNext"],
    tvNotePrevious: catalogue["tvPage.notePrevious"],
    tvNoteVolume: catalogue["tvPage.noteVolume"],
  };
}
