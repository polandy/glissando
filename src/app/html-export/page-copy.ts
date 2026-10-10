import { MILLISECONDS_PER_SECOND } from "../../player";
import type { PageCopy } from "../../html-export/page-contract";
import type { Language, Translator } from "../i18n/translator";
import type { HtmlExportSubject } from "./html-export-state";

/** The exported page's words, fixed in the app's language at export time. */
export interface PageWords {
  readonly lang: Language;
  readonly copy: PageCopy;
  readonly noscript: string;
}

export function pageWords(translator: Translator, subject: HtmlExportSubject): PageWords {
  const { t, formatDuration } = translator;
  return {
    lang: translator.language,
    copy: {
      eyebrow: t("htmlPage.eyebrow"),
      summary: t("htmlPage.summary", {
        pictures: t("units.pictures", { count: subject.pictureCount }),
        duration: formatDuration(subject.durationMs / MILLISECONDS_PER_SECOND),
        music: subject.withMusic ? t("htmlExport.withMusic") : t("htmlExport.withoutMusic"),
      }),
      madeWith: t("htmlPage.madeWith"),
      play: t("htmlPage.play"),
      pause: t("htmlPage.pause"),
      mute: t("htmlPage.mute"),
      unmute: t("htmlPage.unmute"),
      fullScreen: t("htmlPage.fullScreen"),
      timeline: t("htmlPage.timeline"),
      playAgain: t("htmlPage.playAgain"),
      cannotPlay: t("htmlPage.cannotPlay"),
    },
    noscript: t("htmlPage.noscript"),
  };
}
