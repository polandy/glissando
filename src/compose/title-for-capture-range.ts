/**
 * The slideshow's title from its pictures' capture dates: the month (and the range of months)
 * they were taken in, in the given locale, e.g. "July 2025" or "June–August 2025".
 */
export function titleForCaptureRange(capturedAt: readonly string[], locale: string): string {
  if (capturedAt.length === 0) {
    throw new RangeError("capturedAt: expected at least one date, got an empty list");
  }

  const timestamps = capturedAt.map((value) => Date.parse(value));
  const earliest = new Date(Math.min(...timestamps));
  const latest = new Date(Math.max(...timestamps));

  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).formatRange(earliest, latest);
}
