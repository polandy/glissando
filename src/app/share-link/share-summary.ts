import type { Translator } from "../i18n/translator";
import type { ShareSubject } from "./ShareSheet.svelte";

/** The line under a share sheet's heading: title, pictures, duration and whether it has music. */
export function shareSummary(
  { t, formatDuration }: Pick<Translator, "t" | "formatDuration">,
  subject: ShareSubject,
): string {
  return t("share.summary", {
    title: subject.title,
    pictures: t("units.pictures", { count: subject.pictureCount }),
    duration: formatDuration(subject.durationSeconds),
    music: subject.hasMusic ? t("htmlExport.withMusic") : t("htmlExport.withoutMusic"),
  });
}
