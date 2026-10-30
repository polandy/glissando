import type { FilePageLanguages, FilePageWords } from "../../file-page/file-page-words.ts";
import { de } from "../i18n/catalogue-de.ts";
import { en } from "../i18n/catalogue-en.ts";
import type { Catalogue } from "../i18n/messages.ts";

/**
 * `index.html`'s words in both languages, from the catalogue; the build hands them to the page
 * builder (build/file-page-plugin.ts), and the page fills in the slideshow's own numbers.
 */
export function filePageLanguages(): FilePageLanguages {
  return { de: filePageWords(de), en: filePageWords(en) };
}

function filePageWords(catalogue: Catalogue): FilePageWords {
  return {
    eyebrow: catalogue["htmlPage.eyebrow"],
    summary: catalogue["htmlPage.summary"],
    pictures: catalogue["units.pictures"],
    withMusic: catalogue["htmlExport.withMusic"],
    withoutMusic: catalogue["htmlExport.withoutMusic"],
    madeWith: catalogue["htmlPage.madeWith"],
    sampleMusicCredit: catalogue["sampleMusic.credit"],
    play: catalogue["htmlPage.play"],
    pause: catalogue["htmlPage.pause"],
    mute: catalogue["htmlPage.mute"],
    unmute: catalogue["htmlPage.unmute"],
    fullScreen: catalogue["htmlPage.fullScreen"],
    timeline: catalogue["htmlPage.timeline"],
    playAgain: catalogue["htmlPage.playAgain"],
    cannotPlay: catalogue["htmlPage.cannotPlay"],
    noscript: catalogue["htmlPage.noscript"],
    chooseTitle: catalogue["filePage.chooseTitle"],
    chooseText: catalogue["filePage.chooseText"],
    chooseFolder: catalogue["filePage.chooseFolder"],
    noManifest: catalogue["filePage.noManifest"],
    missing: catalogue["filePage.missing"],
    damaged: catalogue["filePage.damaged"],
    foreign: catalogue["filePage.foreign"],
    newer: catalogue["filePage.newer"],
  };
}
