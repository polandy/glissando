import type { Translator } from "../../i18n/translator";

/** What the Music tile's value and summary (ADR-0048) are built from. */
export interface MusicTileInput {
  readonly songCount: number;
  readonly musicTitle: string | null;
  readonly musicSeconds: number | null;
  readonly durationSeconds: number;
}

/** The Music tile's value and summary (ADR-0048). */
export interface MusicTileValue {
  readonly value: string;
  readonly summary: string;
}

/**
 * The Music tile's value and summary (ADR-0048): the song's name, or the song count for several,
 * with the music's length underneath once it differs from the slideshow's; without music, "None"
 * and "Add music".
 */
export function musicTileValue(
  t: Translator["t"],
  formatDuration: Translator["formatDuration"],
  slideshow: MusicTileInput,
): MusicTileValue {
  if (slideshow.songCount === 0) {
    return { value: t("slideshow.noMusic"), summary: t("slideshow.addMusic") };
  }
  const value =
    slideshow.songCount > 1
      ? t("slideshow.songCount", { count: slideshow.songCount })
      : (slideshow.musicTitle ?? t("slideshow.noMusic"));
  const differingMusicSeconds =
    slideshow.musicSeconds !== null &&
    formatDuration(slideshow.musicSeconds) !== formatDuration(slideshow.durationSeconds)
      ? slideshow.musicSeconds
      : null;
  const summary =
    differingMusicSeconds === null
      ? ""
      : t("slideshow.musicLength", { duration: formatDuration(differingMusicSeconds) });
  return { value, summary };
}
