import { MILLISECONDS_PER_SECOND } from "../../../player";
import type { Translator } from "../../i18n/translator";

/**
 * The Mood sheet's "Picture times" row and the info panel's, once the automatic durations vary
 * under energy pacing (ADR-0046): "5 s – 10 s · by energy", each end to the tenth second.
 */
export function energyPictureTimesRangeText(
  translator: Pick<Translator, "t" | "formatSeconds">,
  minMs: number,
  maxMs: number,
): string {
  const { t, formatSeconds } = translator;
  return t("mood.energyPictureTimesRange", {
    from: formatSeconds(minMs / MILLISECONDS_PER_SECOND),
    to: formatSeconds(maxMs / MILLISECONDS_PER_SECOND),
  });
}
