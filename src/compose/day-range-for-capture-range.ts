/**
 * The slideshow's capture range as a day range, in the given locale, e.g. "12–28 July 2025" or
 * "31 December 2024 – 1 January 2025".
 */
export function dayRangeForCaptureRange(capturedAt: readonly string[], locale: string): string {
  if (capturedAt.length === 0) {
    throw new RangeError("capturedAt: expected at least one date, got an empty list");
  }

  const timestamps = capturedAt.map((value) => Date.parse(value));
  const earliest = new Date(Math.min(...timestamps));
  const latest = new Date(Math.max(...timestamps));

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).formatRange(earliest, latest);
}
