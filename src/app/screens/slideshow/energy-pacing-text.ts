import { MILLISECONDS_PER_SECOND } from "../../../player";
import type { Translator } from "../../i18n/translator";

function rangeSeconds(
  translator: Pick<Translator, "formatSeconds">,
  minMs: number,
  maxMs: number,
): { from: string; to: string } {
  return {
    from: translator.formatSeconds(minMs / MILLISECONDS_PER_SECOND),
    to: translator.formatSeconds(maxMs / MILLISECONDS_PER_SECOND),
  };
}

/**
 * The Mood sheet's "Picture times" row, once the automatic durations vary under energy pacing
 * (ADR-0046): "5 s – 10 s · by energy", each end to the tenth second.
 */
export function energyPictureTimesRangeText(
  translator: Pick<Translator, "t" | "formatSeconds">,
  minMs: number,
  maxMs: number,
): string {
  return translator.t("mood.energyPictureTimesRange", rangeSeconds(translator, minMs, maxMs));
}
