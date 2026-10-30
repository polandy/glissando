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

/**
 * The Mood tile's summary (ADR-0048), once the automatic durations vary under energy pacing:
 * the same range without the "by energy" suffix, which the tile's motion and "follows the
 * energy" text already carry.
 */
export function energyPictureTimesRangeValueText(
  translator: Pick<Translator, "t" | "formatSeconds">,
  minMs: number,
  maxMs: number,
): string {
  return translator.t("mood.pictureTimesRange", rangeSeconds(translator, minMs, maxMs));
}

/**
 * Whether `minMs` and `maxMs` read as two different texts once formatted to the tenth second
 * (ADR-0048): false when rounding makes the two ends the same, which would otherwise show a
 * range repeating one number twice.
 */
export function energyPictureTimesRangeDiffers(
  translator: Pick<Translator, "formatSeconds">,
  minMs: number,
  maxMs: number,
): boolean {
  const { from, to } = rangeSeconds(translator, minMs, maxMs);
  return from !== to;
}
